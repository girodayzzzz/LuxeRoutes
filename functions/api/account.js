import { ensureAuthSchema, getAccountSessionEmail, getActiveGrant, getGrantByEmail, hashAccountPassword, makeId, normalizeEmail, nowIso, privateErrorJson, privateJson, requireDb, resolveAccountRole } from './_utils.js';

const profileSelect = `
  SELECT id, email, full_name AS name, default_role AS defaultRole, requested_role AS requestedRole,
    company_name AS companyName, company_website AS companyWebsite, business_context AS businessContext,
    notes, status, password_enabled AS passwordEnabled, created_at AS createdAt, updated_at AS updatedAt
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

export const onRequestPost = async ({ request, env }) => {
  try {
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
    const profileStatus = requestedRole === 'customer' ? 'active' : 'pending_admin_grant';
    const password = String(body.password || '');
    const timestamp = nowIso();

    if (!email) return privateErrorJson('Verified email is required.', 401);
    if (submittedEmail && submittedEmail !== email) {
      return privateErrorJson('Profile email must match the verified account email.', 403);
    }
    if (!name) return privateErrorJson('Full name is required.', 400);
    if (password && password.length < 8) return privateErrorJson('Password must be at least 8 characters.', 400);
    const passwordFields = password ? await hashAccountPassword(password) : null;

    const db = requireDb(env);
    await ensureAuthSchema(db);
    await db.prepare(`
      INSERT INTO profiles (id, email, full_name, default_role, requested_role, company_name, company_website, business_context, notes, status, password_hash, password_salt, password_iterations, password_enabled, created_at, updated_at)
      VALUES (?, ?, ?, 'customer', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        full_name = excluded.full_name,
        requested_role = excluded.requested_role,
        company_name = excluded.company_name,
        company_website = excluded.company_website,
        business_context = excluded.business_context,
        notes = excluded.notes,
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
    `).bind(makeId('profile'), email, name, requestedRole, companyName, companyWebsite, businessContext, notes, profileStatus, passwordFields?.passwordHash || null, passwordFields?.passwordSalt || null, passwordFields?.passwordIterations || null, passwordFields?.passwordEnabled || 0, timestamp, timestamp).run();

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
