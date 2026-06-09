import { createAccountSessionCookie, ensureAuthSchema, errorJson, getActiveGrant, json, makeId, normalizeEmail, nowIso, requireDb } from '../_utils.js';

const OTP_TTL_MINUTES = 10;
const OTP_LENGTH = 6;
const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const MISSING_RESEND_API_KEY_MESSAGE = 'Missing RESEND_API_KEY for OTP email delivery. Recommended setup: Cloudflare Access protects only /admin, while customers, owners, and managers use the public /login.html OTP form. Create one Resend account/API key for the LuxeRoutes site (not one profile per user) and add it as RESEND_API_KEY in Cloudflare Pages production runtime secrets (Workers & Pages → LuxeRoutes → Settings → Environment variables). RESEND_API_TOKEN or RESEND_TOKEN are also accepted aliases.';

const htmlEscape = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character]));

const wantsJsonResponse = (request) => {
  const accept = request.headers.get('Accept') || '';
  const requestedWith = request.headers.get('X-Requested-With') || '';
  return accept.includes('application/json') || requestedWith.toLowerCase() === 'xmlhttprequest';
};

const htmlResponse = (body, init = {}) => new Response(body, {
  ...init,
  headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    ...init.headers,
  },
});

const otpHtmlPage = ({ email = '', message = '', isError = false } = {}) => {
  const safeEmail = htmlEscape(email);
  const safeMessage = htmlEscape(message || 'We emailed your 6-digit LuxeRoutes login code. Enter it below to open your account.');
  const statusClass = isError ? 'otp-status otp-status-error' : 'otp-status otp-status-success';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Enter login code | LuxeRoutes</title>
  <meta name="robots" content="noindex, nofollow" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="admin-page account-page login-page auth-page">
  <main id="main-content">
    <section class="auth-section auth-login-section">
      <div class="container auth-shell">
        <aside class="auth-card login-box" aria-label="LuxeRoutes code verification">
          <div class="login-card-kicker"><span class="login-secure-dot" aria-hidden="true"></span> Secure client portal</div>
          <div class="auth-card-head login-box-head">
            <p class="eyebrow">Sign in</p>
            <h1>Enter your login code</h1>
            <p class="${statusClass}">${safeMessage}</p>
          </div>
          <form class="auth-form login-otp-form" action="/api/auth/otp?action=verify" method="post">
            <div class="otp-summary">
              <span>Code sent to</span>
              <strong>${safeEmail}</strong>
            </div>
            <input name="email" type="hidden" value="${safeEmail}" />
            <label>6-digit code
              <input name="otp" type="text" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" placeholder="123456" required autofocus />
            </label>
            <button class="btn btn-primary" type="submit">Verify and open account</button>
            <a class="btn btn-secondary" href="/login.html">Use a different email</a>
          </form>
        </aside>
      </div>
    </section>
  </main>
</body>
</html>`;
};

const redirectResponse = (location, init = {}) => new Response(null, {
  status: 303,
  ...init,
  headers: {
    Location: location,
    'Cache-Control': 'no-store',
    ...init.headers,
  },
});

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

const parseRequestBody = async (request) => {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return request.json().catch(() => ({}));
  if (contentType.includes('form')) {
    const formData = await request.formData().catch(() => null);
    return formData ? Object.fromEntries(formData.entries()) : {};
  }
  return request.json().catch(() => ({}));
};


const otpErrorResponse = (request, message, status = 400, email = '') => (wantsJsonResponse(request)
  ? errorJson(message, status)
  : htmlResponse(otpHtmlPage({ email, message, isError: true }), { status }));

const requestOtp = async ({ request, env }) => {
  const db = requireDb(env);
  const body = await parseRequestBody(request);
  const email = normalizeEmail(body.email);
  if (!email || !email.includes('@')) return otpErrorResponse(request, 'Valid email is required.', 400, email);

  await ensureOtpSchema(db);
  await ensureAuthSchema(db);

  const grant = await getActiveGrant(db, email);
  if (grant?.role === 'admin') {
    if (!wantsJsonResponse(request)) return redirectResponse('/admin/index.html');

    return json({
      ok: true,
      adminAccess: true,
      redirect: '/admin/index.html',
      message: 'Admin access uses Cloudflare Access. Continue to the admin console to receive the Cloudflare verification check.',
    });
  }

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

  if (!wantsJsonResponse(request)) return htmlResponse(otpHtmlPage({ email }));

  return json({ ok: true, email, expiresAt });
};

const clearAccountSession = () => json({ ok: true }, {
  headers: {
    'Set-Cookie': 'luxeroutes_account_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
  },
});

const verifyOtp = async ({ request, env }) => {
  const db = requireDb(env);
  const body = await parseRequestBody(request);
  const email = normalizeEmail(body.email);
  const otp = String(body.otp || '').trim();
  const remember = body.remember === true || body.remember === 'true' || body.remember === 'on' || body.remember === '1';
  if (!email || !/^\d{6}$/.test(otp)) return otpErrorResponse(request, 'Valid email and 6-digit OTP are required.', 400, email);

  await ensureOtpSchema(db);
  await ensureAuthSchema(db);

  const challenge = await db.prepare(`
    SELECT id, email, otp_hash AS otpHash, attempts, status, expires_at AS expiresAt
    FROM login_otps
    WHERE email = ? AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1
  `).bind(email).first();

  if (!challenge) return otpErrorResponse(request, 'OTP challenge was not found. Request a new code.', 404, email);
  if (new Date(challenge.expiresAt).getTime() < Date.now()) {
    await db.prepare("UPDATE login_otps SET status = 'expired', updated_at = ? WHERE id = ?").bind(nowIso(), challenge.id).run();
    return otpErrorResponse(request, 'OTP code has expired. Request a new code.', 410, email);
  }
  if (challenge.attempts >= 5) {
    await db.prepare("UPDATE login_otps SET status = 'locked', updated_at = ? WHERE id = ?").bind(nowIso(), challenge.id).run();
    return otpErrorResponse(request, 'Too many OTP attempts. Request a new code.', 429, email);
  }

  const otpHash = await hashOtp(otp);
  if (otpHash !== challenge.otpHash) {
    await db.prepare('UPDATE login_otps SET attempts = attempts + 1, updated_at = ? WHERE id = ?').bind(nowIso(), challenge.id).run();
    return otpErrorResponse(request, 'OTP code is not correct.', 401, email);
  }

  await db.prepare("UPDATE login_otps SET status = 'verified', updated_at = ? WHERE id = ?").bind(nowIso(), challenge.id).run();

  const [profile, grant] = await Promise.all([
    getProfile(db, email),
    getActiveGrant(db, email),
  ]);

  const sessionCookie = await createAccountSessionCookie(env, email, { remember });
  const role = grant?.role || profile?.defaultRole || 'customer';
  const redirect = {
    customer: '/account.html',
    owner: '/owner-panel.html',
    manager: '/manager-panel.html',
    admin: '/admin/index.html',
  }[role] || '/account.html';

  if (!wantsJsonResponse(request)) {
    return redirectResponse(redirect, sessionCookie ? { headers: { 'Set-Cookie': sessionCookie } } : {});
  }

  return json({
    ok: true,
    identity: { email },
    profile,
    grant,
    role,
    redirect,
  }, sessionCookie ? { headers: { 'Set-Cookie': sessionCookie } } : {});
};

export const onRequestPost = async (context) => {
  try {
    const action = new URL(context.request.url).searchParams.get('action');
    if (action === 'verify') return await verifyOtp(context);
    if (action === 'logout') return clearAccountSession();
    return await requestOtp(context);
  } catch (error) {
    const message = error.message || 'Unable to process OTP request.';
    return wantsJsonResponse(context.request)
      ? errorJson(message, 500)
      : htmlResponse(otpHtmlPage({ message, isError: true }), { status: 500 });
  }
};
