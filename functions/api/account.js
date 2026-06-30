import { createAccountSessionCookie, ensureAuthSchema, getAccountSessionEmail, getActiveGrant, getGrantByEmail, hashAccountPassword, makeId, normalizeEmail, nowIso, privateErrorJson, privateJson, requireDb, resolveAccountRole } from './_utils.js';

const profileSelect = `
  SELECT id, email, full_name AS name, default_role AS defaultRole, requested_role AS requestedRole,
    company_name AS companyName, company_website AS companyWebsite, business_context AS businessContext,
    notes, status, phone, preferred_contact AS preferredContact, password_enabled AS passwordEnabled, last_login_at AS lastLoginAt, last_login_method AS lastLoginMethod, created_at AS createdAt, updated_at AS updatedAt
  FROM profiles
`;

const getProfile = async (db, email) => db.prepare(`${profileSelect} WHERE lower(trim(email)) = ? LIMIT 1`).bind(email).first();

const getAccessStatus = (profile, grant) => {
  if (!profile) return 'profile_required';
  if (profile.requestedRole && profile.requestedRole !== 'customer' && !['admin', profile.requestedRole].includes(grant?.role)) {
    return profile.status || 'pending_admin_grant';
  }
  return profile.status || 'active';
};

export const onRequestGet = async ({ request, env }) => {
  try {
    const email = await getAccountSessionEmail(request, env);

    if (!email) return privateErrorJson('Verified email is required.', 401);

    const db = requireDb(env);
    await ensureAuthSchema(db);
    const [profile, grant] = await Promise.all([
      getProfile(db, email),
      getActiveGrant(db, email),
    ]);

    return privateJson({
      identityEmail: email,
      profile,
      grant,
      role: resolveAccountRole({ grant, profile }),
      accessStatus: getAccessStatus(profile, grant),
    });
  } catch (error) {
    return privateErrorJson(error.message || 'Unable to load account profile.', 500);
  }
};


const generateCode = () => {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  return String(random[0] % 1000000).padStart(6, '0');
};

const hashCode = async (code) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const ensureEmailChangeSchema = async (db) => {
  await db.prepare(`CREATE TABLE IF NOT EXISTS account_email_changes (
    id TEXT PRIMARY KEY,
    current_email TEXT NOT NULL,
    new_email TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_account_email_changes_current ON account_email_changes(current_email, status)').run();
};

const sendAccountEmail = async (env, to, subject, text) => {
  const apiKey = String(env.RESEND_API_KEY || env.RESEND_API_TOKEN || env.RESEND_TOKEN || '').trim();
  if (!apiKey) throw new Error('Missing RESEND_API_KEY for email verification.');
  const from = String(env.OTP_EMAIL_FROM || env.RESEND_EMAIL_FROM || env.EMAIL_FROM || 'LuxeRoutes <login@luxeroutes.eu>').trim();
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, text }),
  });
  if (!response.ok) throw new Error(`Email delivery failed (${response.status}).`);
};

const requestEmailChange = async ({ request, env }) => {
  const currentEmail = await getAccountSessionEmail(request, env);
  const body = await request.json().catch(() => ({}));
  const newEmail = normalizeEmail(body.email);
  if (!currentEmail) return privateErrorJson('Verified account session is required.', 401);
  if (!newEmail || !newEmail.includes('@')) return privateErrorJson('Valid new email is required.', 400);
  if (newEmail === currentEmail) return privateErrorJson('New email must be different from the current email.', 400);
  const db = requireDb(env);
  await ensureAuthSchema(db);
  await ensureEmailChangeSchema(db);
  if (await getProfile(db, newEmail)) return privateErrorJson('That email is already connected to a LuxeRoutes account.', 409);
  const code = generateCode();
  const timestamp = nowIso();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await db.prepare("UPDATE account_email_changes SET status = 'expired', updated_at = ? WHERE current_email = ? AND status = 'pending'").bind(timestamp, currentEmail).run();
  await db.prepare('INSERT INTO account_email_changes (id, current_email, new_email, otp_hash, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(makeId('email_change'), currentEmail, newEmail, await hashCode(code), expiresAt, timestamp, timestamp).run();
  await sendAccountEmail(env, newEmail, 'Verify your LuxeRoutes email change', `Your LuxeRoutes email change code is ${code}. It is valid for 10 minutes.`);
  return privateJson({ ok: true, email: newEmail, expiresAt });
};

const confirmEmailChange = async ({ request, env }) => {
  const currentEmail = await getAccountSessionEmail(request, env);
  const body = await request.json().catch(() => ({}));
  const newEmail = normalizeEmail(body.email);
  const otp = String(body.otp || '').trim();
  if (!currentEmail) return privateErrorJson('Verified account session is required.', 401);
  if (!newEmail || !/^\d{6}$/.test(otp)) return privateErrorJson('Valid new email and 6-digit code are required.', 400);
  const db = requireDb(env);
  await ensureAuthSchema(db);
  await ensureEmailChangeSchema(db);
  const challenge = await db.prepare("SELECT * FROM account_email_changes WHERE current_email = ? AND new_email = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1").bind(currentEmail, newEmail).first();
  if (!challenge) return privateErrorJson('Email change code was not found. Request a new code.', 404);
  if (new Date(challenge.expires_at).getTime() < Date.now()) return privateErrorJson('Email change code expired. Request a new code.', 410);
  if (challenge.attempts >= 5) return privateErrorJson('Too many attempts. Request a new code.', 429);
  if (await hashCode(otp) !== challenge.otp_hash) {
    await db.prepare('UPDATE account_email_changes SET attempts = attempts + 1, updated_at = ? WHERE id = ?').bind(nowIso(), challenge.id).run();
    return privateErrorJson('Email change code is not correct.', 401);
  }
  const timestamp = nowIso();
  await db.prepare('UPDATE profiles SET email = ?, updated_at = ? WHERE lower(trim(email)) = ?').bind(newEmail, timestamp, currentEmail).run();
  await db.prepare('UPDATE access_grants SET email = ?, updated_at = ? WHERE lower(trim(email)) = ?').bind(newEmail, timestamp, currentEmail).run();
  await db.prepare("UPDATE account_email_changes SET status = 'verified', updated_at = ? WHERE id = ?").bind(timestamp, challenge.id).run();
  const profile = await getProfile(db, newEmail);
  const grant = await getActiveGrant(db, newEmail);
  const sessionCookie = await createAccountSessionCookie(env, newEmail, { remember: true });
  return privateJson({ ok: true, identity: { email: newEmail }, profile, grant, role: resolveAccountRole({ grant, profile }), accessStatus: getAccessStatus(profile, grant) }, sessionCookie ? { headers: { 'Set-Cookie': sessionCookie } } : {});
};

export const onRequestPost = async ({ request, env }) => {
  try {
    const action = new URL(request.url).searchParams.get('action');
    if (action === 'email-change-request') return await requestEmailChange({ request, env });
    if (action === 'email-change-confirm') return await confirmEmailChange({ request, env });
    const identityEmail = await getAccountSessionEmail(request, env);
    const body = await request.json().catch(() => ({}));
    const submittedEmail = normalizeEmail(body.email);
    const email = normalizeEmail(identityEmail);
    const name = String(body.name || '').trim().slice(0, 220);
    const requestedRole = ['customer', 'owner', 'manager'].includes(body.requestedRole) ? body.requestedRole : 'customer';
    const companyName = String(body.companyName || '').trim().slice(0, 220);
    const companyWebsite = String(body.companyWebsite || '').trim().slice(0, 1000);
    const businessContext = String(body.businessContext || '').trim().slice(0, 4000);
    const notes = String(body.notes || '').trim().slice(0, 4000);
    const phone = String(body.phone || '').trim().slice(0, 120);
    const preferredContact = ['email', 'whatsapp', 'phone'].includes(body.preferredContact) ? body.preferredContact : 'email';
    const profileStatus = requestedRole === 'customer' ? 'active' : 'pending_admin_grant';
    const password = String(body.password || '');
    const passwordConfirm = String(body.passwordConfirm || body.password_confirm || '');
    const timestamp = nowIso();

    if (!email) return privateErrorJson('Verified email is required.', 401);
    if (submittedEmail && submittedEmail !== email) {
      return privateErrorJson('Profile email must match the verified account email.', 403);
    }
    if (!name) return privateErrorJson('Full name is required.', 400);
    if (password && password.length < 8) return privateErrorJson('Password must be at least 8 characters.', 400);
    if (password && passwordConfirm && password !== passwordConfirm) return privateErrorJson('Password confirmation does not match.', 400);
    const passwordFields = password ? await hashAccountPassword(password) : null;

    const db = requireDb(env);
    await ensureAuthSchema(db);
    await db.prepare(`
      INSERT INTO profiles (id, email, full_name, default_role, requested_role, company_name, company_website, business_context, notes, phone, preferred_contact, status, password_hash, password_salt, password_iterations, password_enabled, created_at, updated_at)
      VALUES (?, ?, ?, 'customer', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        full_name = excluded.full_name,
        requested_role = excluded.requested_role,
        company_name = excluded.company_name,
        company_website = excluded.company_website,
        business_context = excluded.business_context,
        notes = excluded.notes,
        phone = excluded.phone,
        preferred_contact = excluded.preferred_contact,
        password_hash = COALESCE(excluded.password_hash, profiles.password_hash),
        password_salt = COALESCE(excluded.password_salt, profiles.password_salt),
        password_iterations = COALESCE(excluded.password_iterations, profiles.password_iterations),
        password_enabled = CASE WHEN excluded.password_enabled = 1 THEN 1 ELSE profiles.password_enabled END,
        status = CASE
          WHEN excluded.requested_role = 'customer' THEN 'active'
          WHEN profiles.status = 'active' AND profiles.default_role IN ('owner', 'manager', 'admin') THEN profiles.status
          ELSE excluded.status
        END,
        updated_at = excluded.updated_at
    `).bind(makeId('profile'), email, name, requestedRole, companyName, companyWebsite, businessContext, notes, phone, preferredContact, profileStatus, passwordFields?.passwordHash || null, passwordFields?.passwordSalt || null, passwordFields?.passwordIterations || null, passwordFields?.passwordEnabled || 0, timestamp, timestamp).run();

    const existingGrant = await getGrantByEmail(db, email);
    if (!existingGrant) {
      await db.prepare(`
        INSERT INTO access_grants (id, email, role, note, granted_by_email, status, created_at, updated_at)
        VALUES (?, ?, 'customer', 'Default customer role from account registration', NULL, 'active', ?, ?)
      `).bind(makeId('grant'), email, timestamp, timestamp).run();
    }

    const [profile, grant] = await Promise.all([
      getProfile(db, email),
      getActiveGrant(db, email),
    ]);

    return privateJson({ profile, grant, role: resolveAccountRole({ grant, profile }), accessStatus: getAccessStatus(profile, grant) }, { status: 201 });
  } catch (error) {
    return privateErrorJson(error.message || 'Unable to save account profile.', 500);
  }
};
