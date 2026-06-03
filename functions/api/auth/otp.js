import { errorJson, getActiveGrant, json, makeId, normalizeEmail, nowIso, requireDb } from '../_utils.js';

const OTP_TTL_MINUTES = 10;
const OTP_LENGTH = 6;
const RESEND_ENDPOINT = 'https://api.resend.com/emails';

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

const getProfile = async (db, email) => db.prepare(`
  SELECT id, email, full_name AS name, default_role AS defaultRole, requested_role AS requestedRole,
    company_name AS companyName, company_website AS companyWebsite, business_context AS businessContext,
    notes, status, created_at AS createdAt, updated_at AS updatedAt
  FROM profiles
  WHERE email = ?
  LIMIT 1
`).bind(email).first();

const sendOtpEmail = async (env, email, otp) => {
  if (!env.RESEND_API_KEY || !env.OTP_EMAIL_FROM) {
    throw new Error('Missing RESEND_API_KEY or OTP_EMAIL_FROM for OTP email delivery.');
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.OTP_EMAIL_FROM,
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

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const timestamp = nowIso();
  const expiresAt = minutesFromNow(OTP_TTL_MINUTES);

  await db.prepare(`
    INSERT INTO login_otps (id, email, otp_hash, attempts, status, expires_at, created_at, updated_at)
    VALUES (?, ?, ?, 0, 'pending', ?, ?, ?)
  `).bind(makeId('otp'), email, otpHash, expiresAt, timestamp, timestamp).run();

  await sendOtpEmail(env, email, otp);

  return json({ ok: true, email, expiresAt });
};

const verifyOtp = async ({ request, env }) => {
  const db = requireDb(env);
  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  const otp = String(body.otp || '').trim();
  if (!email || !/^\d{6}$/.test(otp)) return errorJson('Valid email and 6-digit OTP are required.', 400);

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

  return json({
    ok: true,
    identity: { email },
    profile,
    grant,
    role: grant?.role || profile?.defaultRole || 'customer',
  });
};

export const onRequestPost = async (context) => {
  try {
    const action = new URL(context.request.url).searchParams.get('action');
    if (action === 'verify') return verifyOtp(context);
    return requestOtp(context);
  } catch (error) {
    return errorJson(error.message || 'Unable to process OTP request.', 500);
  }
};
