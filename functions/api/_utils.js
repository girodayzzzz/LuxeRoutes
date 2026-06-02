const ROLE_ORDER = ['customer', 'owner', 'manager', 'admin'];

export const json = (data, init = {}) => new Response(JSON.stringify(data), {
  ...init,
  headers: {
    'Content-Type': 'application/json',
    ...init.headers,
  },
});

export const errorJson = (message, status = 400) => json({ error: message }, { status });

export const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

export const isValidRole = (role, roles = ROLE_ORDER) => roles.includes(role);

export const getIdentityEmail = (request) => normalizeEmail(
  request.headers.get('CF-Access-Authenticated-User-Email')
  || request.headers.get('cf-access-authenticated-user-email')
);

export const makeId = (prefix) => `${prefix}-${crypto.randomUUID()}`;

export const nowIso = () => new Date().toISOString();

export const requireDb = (env) => {
  if (!env.DB) throw new Error('Missing Cloudflare D1 binding: DB');
  return env.DB;
};

export const getActiveGrant = async (db, email) => {
  if (!email) return null;
  return db.prepare(`
    SELECT id, email, role, note, granted_by_email AS grantedByEmail, status, created_at AS createdAt, updated_at AS updatedAt
    FROM access_grants
    WHERE email = ? AND status = 'active'
    LIMIT 1
  `).bind(email).first();
};

export const requireAdmin = async (request, env) => {
  const db = requireDb(env);
  const email = getIdentityEmail(request);
  if (!email) return { error: errorJson('Cloudflare Access identity is required.', 401) };

  const grant = await getActiveGrant(db, email);
  if (grant?.role !== 'admin') {
    return { error: errorJson('Admin access grant is required for this API route.', 403) };
  }

  return { db, email, grant };
};
