import { privateErrorJson, isValidRole, privateJson, makeId, normalizeEmail, nowIso, requireAdmin } from '../_utils.js';

const grantSelect = `
  SELECT id, email, role, note, granted_by_email AS grantedByEmail, status,
    created_at AS createdAt, updated_at AS updatedAt
  FROM access_grants
`;

export const onRequestGet = async ({ request, env }) => {
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;

    const profiles = await auth.db.prepare(`
      SELECT p.id, p.email, p.full_name AS name, p.default_role AS defaultRole, p.requested_role AS requestedRole,
        p.company_name AS companyName, p.company_website AS companyWebsite, p.business_context AS businessContext,
        p.notes, p.status, p.created_at AS createdAt, p.updated_at AS updatedAt,
        g.role AS grantedRole, g.note AS grantNote, g.status AS grantStatus
      FROM profiles p
      LEFT JOIN access_grants g ON g.email = p.email
      ORDER BY p.updated_at DESC
      LIMIT 500
    `).all();

    const grants = await auth.db.prepare(`${grantSelect} ORDER BY updated_at DESC LIMIT 500`).all();
    return privateJson({ profiles: profiles.results || [], grants: grants.results || [] });
  } catch (error) {
    return privateErrorJson(error.message || 'Unable to load access grants.', 500);
  }
};

export const onRequestPost = async ({ request, env }) => {
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body.email);
    const role = String(body.role || 'customer');
    const note = String(body.note || '').trim();
    const action = String(body.action || 'approve');
    const timestamp = nowIso();

    if (!email) return privateErrorJson('Email is required.', 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return privateErrorJson('Valid email is required.', 400);
    if (!isValidRole(role)) return privateErrorJson('Invalid role.', 400);
    if (!['approve', 'reject'].includes(action)) return privateErrorJson('Invalid grant action.', 400);
    if (email === auth.email && (action === 'reject' || role !== 'admin')) {
      return privateErrorJson('You cannot remove or downgrade your own admin access.', 400);
    }

    if (action === 'reject') {
      await auth.db.prepare(`
        UPDATE profiles
        SET status = 'rejected', default_role = 'customer', updated_at = ?
        WHERE email = ?
      `).bind(timestamp, email).run();

      await auth.db.prepare(`
        INSERT INTO access_grants (id, email, role, note, granted_by_email, status, created_at, updated_at)
        VALUES (?, ?, 'customer', ?, ?, 'active', ?, ?)
        ON CONFLICT(email) DO UPDATE SET
          role = CASE WHEN access_grants.role = 'admin' THEN access_grants.role ELSE 'customer' END,
          note = excluded.note,
          granted_by_email = excluded.granted_by_email,
          status = 'active',
          updated_at = excluded.updated_at
      `).bind(
        makeId('grant'),
        email,
        note || 'Owner/manager request rejected; customer access retained',
        auth.email,
        timestamp,
        timestamp,
      ).run();

      const [profile, grant] = await Promise.all([
        auth.db.prepare(`
          SELECT id, email, full_name AS name, default_role AS defaultRole, requested_role AS requestedRole,
            company_name AS companyName, company_website AS companyWebsite, business_context AS businessContext,
            notes, status, created_at AS createdAt, updated_at AS updatedAt
          FROM profiles
          WHERE email = ?
          LIMIT 1
        `).bind(email).first(),
        auth.db.prepare(`${grantSelect} WHERE email = ? LIMIT 1`).bind(email).first(),
      ]);

      return privateJson({ profile, grant, action: 'reject' });
    }

    await auth.db.prepare(`
      INSERT INTO access_grants (id, email, role, note, granted_by_email, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        role = excluded.role,
        note = excluded.note,
        granted_by_email = excluded.granted_by_email,
        status = 'active',
        updated_at = excluded.updated_at
    `).bind(makeId('grant'), email, role, note, auth.email, timestamp, timestamp).run();

    await auth.db.prepare(`
      INSERT INTO profiles (id, email, full_name, default_role, requested_role, notes, status, created_at, updated_at)
      VALUES (?, ?, NULL, ?, 'customer', NULL, 'active', ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        default_role = excluded.default_role,
        status = 'active',
        updated_at = excluded.updated_at
    `).bind(makeId('profile'), email, role, timestamp, timestamp).run();

    const [profile, grant] = await Promise.all([
      auth.db.prepare(`
        SELECT id, email, full_name AS name, default_role AS defaultRole, requested_role AS requestedRole,
          company_name AS companyName, company_website AS companyWebsite, business_context AS businessContext,
          notes, status, created_at AS createdAt, updated_at AS updatedAt
        FROM profiles
        WHERE email = ?
        LIMIT 1
      `).bind(email).first(),
      auth.db.prepare(`${grantSelect} WHERE email = ? LIMIT 1`).bind(email).first(),
    ]);

    return privateJson({ profile, grant, action: 'approve' }, { status: 201 });
  } catch (error) {
    return privateErrorJson(error.message || 'Unable to save access grant.', 500);
  }
};
