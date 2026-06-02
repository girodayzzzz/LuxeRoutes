import { errorJson, getActiveGrant, getIdentityEmail, json, makeId, normalizeEmail, nowIso, requireDb } from './_utils.js';

const profileSelect = `
  SELECT id, email, full_name AS name, default_role AS defaultRole, requested_role AS requestedRole,
    company_name AS companyName, company_website AS companyWebsite, business_context AS businessContext,
    notes, status, created_at AS createdAt, updated_at AS updatedAt
  FROM profiles
`;

const getProfile = async (db, email) => db.prepare(`${profileSelect} WHERE email = ? LIMIT 1`).bind(email).first();

export const onRequestGet = async ({ request, env }) => {
  try {
    const db = requireDb(env);
    const identityEmail = getIdentityEmail(request);
    const requestedEmail = normalizeEmail(new URL(request.url).searchParams.get('email'));
    const email = identityEmail || requestedEmail;

    if (!email) return errorJson('Verified email is required.', 401);

    const [profile, grant] = await Promise.all([
      getProfile(db, email),
      getActiveGrant(db, email),
    ]);

    return json({
      identityEmail,
      profile,
      grant,
      role: grant?.role || profile?.defaultRole || 'customer',
    });
  } catch (error) {
    return errorJson(error.message || 'Unable to load account profile.', 500);
  }
};

export const onRequestPost = async ({ request, env }) => {
  try {
    const db = requireDb(env);
    const identityEmail = getIdentityEmail(request);
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(identityEmail || body.email);
    const name = String(body.name || '').trim();
    const requestedRole = ['customer', 'owner', 'manager'].includes(body.requestedRole) ? body.requestedRole : 'customer';
    const companyName = String(body.companyName || '').trim();
    const companyWebsite = String(body.companyWebsite || '').trim();
    const businessContext = String(body.businessContext || '').trim();
    const notes = String(body.notes || '').trim();
    const profileStatus = requestedRole === 'customer' ? 'active' : 'pending_admin_grant';
    const timestamp = nowIso();

    if (!email) return errorJson('Email is required.', 400);
    if (!name) return errorJson('Full name is required.', 400);

    await db.prepare(`
      INSERT INTO profiles (id, email, full_name, default_role, requested_role, company_name, company_website, business_context, notes, status, created_at, updated_at)
      VALUES (?, ?, ?, 'customer', ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        full_name = excluded.full_name,
        requested_role = excluded.requested_role,
        company_name = excluded.company_name,
        company_website = excluded.company_website,
        business_context = excluded.business_context,
        notes = excluded.notes,
        status = CASE
          WHEN excluded.requested_role = 'customer' THEN 'active'
          WHEN profiles.status = 'active' AND profiles.default_role IN ('owner', 'manager', 'admin') THEN profiles.status
          ELSE excluded.status
        END,
        updated_at = excluded.updated_at
    `).bind(makeId('profile'), email, name, requestedRole, companyName, companyWebsite, businessContext, notes, profileStatus, timestamp, timestamp).run();

    await db.prepare(`
      INSERT INTO access_grants (id, email, role, note, granted_by_email, status, created_at, updated_at)
      VALUES (?, ?, 'customer', 'Default customer role from account registration', NULL, 'active', ?, ?)
      ON CONFLICT(email) DO NOTHING
    `).bind(makeId('grant'), email, timestamp, timestamp).run();

    const [profile, grant] = await Promise.all([
      getProfile(db, email),
      getActiveGrant(db, email),
    ]);

    return json({ profile, grant, role: grant?.role || 'customer' }, { status: 201 });
  } catch (error) {
    return errorJson(error.message || 'Unable to save account profile.', 500);
  }
};
