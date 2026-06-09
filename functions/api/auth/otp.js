import { errorJson, json } from '../_utils.js';

const ACCESS_LOGIN_MESSAGE = 'LuxeRoutes account login is handled by Cloudflare Access. Open the protected account entry to verify your email.';

export const onRequestGet = () => json({
  ok: false,
  auth: 'cloudflare_access',
  redirect: '/account.html',
  message: ACCESS_LOGIN_MESSAGE,
}, { status: 410 });

export const onRequestPost = async (context) => {
  const action = new URL(context.request.url).searchParams.get('action');
  if (action === 'logout') {
    return json({ ok: true, logout: '/cdn-cgi/access/logout' }, {
      headers: {
        'Set-Cookie': 'luxeroutes_account_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
      },
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
  const remember = body.remember === true || ['1', 'true', 'on', 'yes'].includes(String(body.remember || '').toLowerCase());
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
