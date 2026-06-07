import { createAccountSessionCookie, errorJson, getActiveGrant, json, makeId, normalizeEmail, nowIso, requireDb } from '../_utils.js';

const OTP_TTL_MINUTES = 10;
const OTP_LENGTH = 6;
const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const MISSING_RESEND_API_KEY_MESSAGE = 'Missing RESEND_API_KEY for OTP email delivery. Add RESEND_API_KEY as a Cloudflare Pages production runtime secret (Workers & Pages → LuxeRoutes → Settings → Environment variables). RESEND_API_TOKEN or RESEND_TOKEN are also accepted aliases.';

const generateOtp = () => {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  return String(random[0] % (10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');
};

const hashOtp = async (otp) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(otp));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const minutesFromNow = (minutes) => new Date(Date.now() + (minutes * 60 * 1000)).toISOString();

const otpSchemaStatements = [
  `CREATE TABLE IF NOT EXISTS login_otps (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'expired', 'locked')),
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_login_otps_email_status ON login_otps(email, status)',
  'CREATE INDEX IF NOT EXISTS idx_login_otps_expires_at ON login_otps(expires_at)',
];

const ensureOtpSchema = async (db) => {
  for (const statement of otpSchemaStatements) {
    await db.prepare(statement).run();
  }
};

const getProfile = async (db, email) => db.prepare(`
  SELECT id, email, full_name AS name, default_role AS defaultRole, requested_role AS requestedRole,
    company_name AS companyName, company_website AS companyWebsite, business_context AS businessContext,
    notes, status, created_at AS createdAt, updated_at AS updatedAt
  FROM profiles
  WHERE email = ?
  LIMIT 1
`).bind(email).first();

const getEnvValue = (env = {}, keys = []) => keys
  .map((key) => String(env[key] || '').trim())
  .find(Boolean) || '';

const getOtpEmailConfig = (env = {}) => ({
  apiKey: getEnvValue(env, ['RESEND_API_KEY', 'RESEND_API_TOKEN', 'RESEND_TOKEN']),
  from: getEnvValue(env, ['OTP_EMAIL_FROM', 'RESEND_EMAIL_FROM', 'RESEND_FROM_EMAIL', 'EMAIL_FROM', 'FROM_EMAIL'])
    || 'LuxeRoutes <login@luxeroutes.eu>',
});

const sendOtpEmail = async (env, email, otp) => {
  const { apiKey, from } = getOtpEmailConfig(env);

  if (!apiKey) {
    throw new Error(MISSING_RESEND_API_KEY_MESSAGE);
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: 'Your LuxeRoutes OTP code',
      text: `Your LuxeRoutes OTP code is ${otp}. It is valid for ${OTP_TTL_MINUTES} minutes. If you did not request this login, you can ignore this email.`,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`OTP email delivery failed (${response.status}). ${details}`.trim());
  }
};

const requestOtp = async ({ request, env }) => {
  const db = requireDb(env);
  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  if (!email || !email.includes('@')) return errorJson('Valid email is required.', 400);

  await ensureOtpSchema(db);

  const timestamp = nowIso();
  await db.prepare(`
    UPDATE login_otps
    SET status = 'expired', updated_at = ?
    WHERE email = ? AND status = 'pending' AND expires_at <= ?
  `).bind(timestamp, email, timestamp).run();
  await db.prepare(`
    DELETE FROM login_otps
    WHERE email = ? AND status IN ('verified', 'expired', 'locked') AND updated_at < datetime('now', '-7 days')
  `).bind(email).run();

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const otpId = makeId('otp');
  const expiresAt = minutesFromNow(OTP_TTL_MINUTES);

  await db.prepare(`
    INSERT INTO login_otps (id, email, otp_hash, attempts, status, expires_at, created_at, updated_at)
    VALUES (?, ?, ?, 0, 'pending', ?, ?, ?)
  `).bind(otpId, email, otpHash, expiresAt, timestamp, timestamp).run();

  try {
    await sendOtpEmail(env, email, otp);
  } catch (error) {
    await db.prepare('DELETE FROM login_otps WHERE id = ?').bind(otpId).run();
    throw error;
  }

  return json({ ok: true, email, expiresAt });
};

const clearAccountSession = () => json({ ok: true }, {
  headers: {
    'Set-Cookie': 'luxeroutes_account_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
  },
});

const verifyOtp = async ({ request, env }) => {
  const db = requireDb(env);
  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  const otp = String(body.otp || '').trim();
  if (!email || !/^\d{6}$/.test(otp)) return errorJson('Valid email and 6-digit OTP are required.', 400);

  await ensureOtpSchema(db);

  const challenge = await db.prepare(`
    SELECT id, email, otp_hash AS otpHash, attempts, status, expires_at AS expiresAt
    FROM login_otps
    WHERE email = ? AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1
  `).bind(email).first();

  if (!challenge) return errorJson('OTP challenge was not found. Request a new code.', 404);
  if (new Date(challenge.expiresAt).getTime() < Date.now()) {
    await db.prepare("UPDATE login_otps SET status = 'expired', updated_at = ? WHERE id = ?").bind(nowIso(), challenge.id).run();
    return errorJson('OTP code has expired. Request a new code.', 410);
  }
  if (challenge.attempts >= 5) {
    await db.prepare("UPDATE login_otps SET status = 'locked', updated_at = ? WHERE id = ?").bind(nowIso(), challenge.id).run();
    return errorJson('Too many OTP attempts. Request a new code.', 429);
  }

  const otpHash = await hashOtp(otp);
  if (otpHash !== challenge.otpHash) {
    await db.prepare('UPDATE login_otps SET attempts = attempts + 1, updated_at = ? WHERE id = ?').bind(nowIso(), challenge.id).run();
    return errorJson('OTP code is not correct.', 401);
  }

  await db.prepare("UPDATE login_otps SET status = 'verified', updated_at = ? WHERE id = ?").bind(nowIso(), challenge.id).run();

  const [profile, grant] = await Promise.all([
    getProfile(db, email),
    getActiveGrant(db, email),
  ]);

  const sessionCookie = await createAccountSessionCookie(env, email);

  return json({
    ok: true,
    identity: { email },
    profile,
    grant,
    role: grant?.role || profile?.defaultRole || 'customer',
  }, sessionCookie ? { headers: { 'Set-Cookie': sessionCookie } } : {});
};

export const onRequestPost = async (context) => {
  try {
    const action = new URL(context.request.url).searchParams.get('action');
    if (action === 'verify') return await verifyOtp(context);
    if (action === 'logout') return clearAccountSession();
    return await requestOtp(context);
  } catch (error) {
    return errorJson(error.message || 'Unable to process OTP request.', 500);
  }
};
