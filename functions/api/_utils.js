const ROLE_ORDER = ['customer', 'owner', 'manager', 'admin'];

export const json = (data, init = {}) => new Response(JSON.stringify(data), {
  ...init,
  headers: {
    'Content-Type': 'application/json',
    ...init.headers,
  },
});

export const errorJson = (message, status = 400) => json({ error: message }, { status });

export const privateJson = (data, init = {}) => json(data, {
  ...init,
  headers: { 'Cache-Control': 'no-store', ...init.headers },
});

export const privateErrorJson = (message, status = 400) => privateJson({ error: message }, { status });

export const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

export const isValidRole = (role, roles = ROLE_ORDER) => roles.includes(role);


const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export const getEnvValue = (env = {}, keys = []) => keys
  .map((key) => String(env[key] || '').trim())
  .find(Boolean) || '';

const normalizeEmailList = (value) => String(value || '')
  .split(/[;,\n]+/)
  .map(normalizeEmail)
  .filter((email) => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

export const getNotificationRecipients = (env = {}, keys = []) => [...new Set(normalizeEmailList(getEnvValue(env, keys)))];

export const sendTransactionalEmail = async (env = {}, { to, subject, text, html, from } = {}) => {
  const apiKey = getEnvValue(env, ['RESEND_API_KEY', 'RESEND_API_TOKEN', 'RESEND_TOKEN']);
  const recipients = Array.isArray(to) ? to.map(normalizeEmail).filter(Boolean) : normalizeEmailList(to);
  const sender = String(from || getEnvValue(env, ['NOTIFICATION_EMAIL_FROM', 'OTP_EMAIL_FROM', 'RESEND_EMAIL_FROM', 'RESEND_FROM_EMAIL', 'EMAIL_FROM', 'FROM_EMAIL']) || 'LuxeRoutes <login@luxeroutes.eu>').trim();

  if (!apiKey || recipients.length === 0 || !subject || (!text && !html)) {
    return { sent: false, skipped: true };
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: sender,
      to: recipients.length === 1 ? recipients[0] : recipients,
      subject,
      ...(text ? { text } : {}),
      ...(html ? { html } : {}),
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Notification email delivery failed (${response.status}). ${details}`.trim());
  }

  return { sent: true };
};


const normalizeRole = (role) => (isValidRole(role) ? role : 'customer');

const getCloudflareAccessJwt = (request) => {
  const headerToken = request.headers.get('Cf-Access-Jwt-Assertion')
    || request.headers.get('cf-access-jwt-assertion');
  if (headerToken) return headerToken.trim();

  return parseCookies(request).CF_Authorization || '';
};

const jsonFromBase64Url = (value) => JSON.parse(base64UrlDecode(value));

const getAccessConfig = (env = {}) => ({
  teamDomain: String(env.CLOUDFLARE_ACCESS_TEAM_DOMAIN || env.ACCESS_TEAM_DOMAIN || '').trim().replace(/^https?:\/\//, '').replace(/\/$/, ''),
  audience: String(env.CLOUDFLARE_ACCESS_AUD || env.ACCESS_AUD || '').trim(),
});

const accessCertCache = new Map();

const getAccessCerts = async (teamDomain) => {
  const cached = accessCertCache.get(teamDomain);
  if (cached && cached.expiresAt > Date.now()) return cached.keys;

  const response = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Unable to load Cloudflare Access signing keys.');
  const data = await response.json();
  const keys = Array.isArray(data.keys) ? data.keys : [];
  accessCertCache.set(teamDomain, { keys, expiresAt: Date.now() + 10 * 60 * 1000 });
  return keys;
};

const verifyAccessJwt = async (token, env = {}) => {
  const [encodedHeader, encodedPayload, encodedSignature] = String(token || '').split('.');
  if (!encodedHeader || !encodedPayload || !encodedSignature) return null;

  const { teamDomain, audience } = getAccessConfig(env);
  if (!teamDomain || !audience) throw new Error('Cloudflare Access JWT validation requires CLOUDFLARE_ACCESS_TEAM_DOMAIN and CLOUDFLARE_ACCESS_AUD environment variables.');

  const header = jsonFromBase64Url(encodedHeader);
  const payload = jsonFromBase64Url(encodedPayload);
  const issuer = `https://${teamDomain}`;
  const payloadAudience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  const now = Math.floor(Date.now() / 1000);

  if (payload.iss !== issuer) throw new Error('Cloudflare Access JWT issuer did not match this team domain.');
  if (!payloadAudience.includes(audience)) throw new Error('Cloudflare Access JWT audience did not match this application.');
  if (payload.exp && now >= Number(payload.exp)) throw new Error('Cloudflare Access JWT is expired.');
  if (payload.nbf && now < Number(payload.nbf)) throw new Error('Cloudflare Access JWT is not valid yet.');

  const keys = await getAccessCerts(teamDomain);
  const jwk = keys.find((key) => key.kid === header.kid) || keys[0];
  if (!jwk) throw new Error('Cloudflare Access signing key was not found.');

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const signatureBytes = Uint8Array.from(base64UrlDecode(encodedSignature), (character) => character.charCodeAt(0));
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    signatureBytes,
    textEncoder.encode(`${encodedHeader}.${encodedPayload}`),
  );
  if (!valid) throw new Error('Cloudflare Access JWT signature is invalid.');

  return payload;
};

export const getIdentityEmail = (request) => normalizeEmail(
  request.headers.get('CF-Access-Authenticated-User-Email')
  || request.headers.get('cf-access-authenticated-user-email')
);

export const getAccessIdentityEmail = async (request, env = {}) => {
  const headerEmail = getIdentityEmail(request);
  if (headerEmail) return headerEmail;

  const token = getCloudflareAccessJwt(request);
  if (!token) return '';

  const payload = await verifyAccessJwt(token, env);
  return normalizeEmail(payload?.email);
};

const ACCOUNT_SESSION_COOKIE = 'luxeroutes_account_session';
const ACCOUNT_SESSION_TTL_SECONDS = 4 * 60 * 60;
const ACCOUNT_SESSION_REMEMBERED_TTL_SECONDS = 30 * 24 * 60 * 60;
const textEncoder = new TextEncoder();

const base64UrlEncode = (value) => btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

const bytesToBase64Url = (bytes) => {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return base64UrlEncode(binary);
};

const base64UrlDecode = (value) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return atob(padded);
};

const getAccountSessionSecret = (env) => env.AUTH_SESSION_SECRET || env.RESEND_API_KEY || '';

const signAccountSessionPayload = async (payload, secret) => {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(payload));
  return bytesToBase64Url(new Uint8Array(signature));
};

const timingSafeEqual = (left, right) => {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
};

export const parseCookies = (request) => Object.fromEntries(
  String(request.headers.get('Cookie') || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [name, ...valueParts] = part.split('=');
      return [name, valueParts.join('=')];
    }),
);

export const createAccountSessionCookie = async (env, email, { remember = false } = {}) => {
  const normalizedEmail = normalizeEmail(email);
  const secret = getAccountSessionSecret(env);
  if (!secret || !normalizedEmail) return null;

  const maxAge = remember ? ACCOUNT_SESSION_REMEMBERED_TTL_SECONDS : ACCOUNT_SESSION_TTL_SECONDS;
  const expiresAt = Date.now() + (maxAge * 1000);
  const payload = base64UrlEncode(JSON.stringify({ email: normalizedEmail, expiresAt }));
  const signature = await signAccountSessionPayload(payload, secret);
  const token = `${payload}.${signature}`;

  return `${ACCOUNT_SESSION_COOKIE}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
};

export const getAccountSessionEmail = async (request, env) => {
  const accessEmail = getIdentityEmail(request);
  if (accessEmail) return accessEmail;

  const secret = getAccountSessionSecret(env);
  const token = parseCookies(request)[ACCOUNT_SESSION_COOKIE];
  if (!secret || !token) return '';

  const [payload, signature] = token.split('.');
  if (!payload || !signature) return '';

  const expectedSignature = await signAccountSessionPayload(payload, secret);
  if (!timingSafeEqual(signature, expectedSignature)) return '';

  try {
    const session = JSON.parse(base64UrlDecode(payload));
    if (!session?.expiresAt || Date.now() >= session.expiresAt) return '';
    return normalizeEmail(session.email);
  } catch (error) {
    return '';
  }
};


const authSchemaStatements = [
  `CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    default_role TEXT NOT NULL DEFAULT 'customer' CHECK (default_role IN ('customer', 'owner', 'manager', 'admin')),
    requested_role TEXT NOT NULL DEFAULT 'customer' CHECK (requested_role IN ('customer', 'owner', 'manager')),
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending_admin_grant',
    company_name TEXT,
    company_website TEXT,
    business_context TEXT,
    password_hash TEXT,
    password_salt TEXT,
    password_iterations INTEGER,
    password_enabled INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS access_grants (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('customer', 'owner', 'manager', 'admin')),
    note TEXT,
    granted_by_email TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email)',
  'CREATE INDEX IF NOT EXISTS idx_access_grants_email ON access_grants(email)',
  'CREATE INDEX IF NOT EXISTS idx_access_grants_role ON access_grants(role)',
];

const ensureOptionalColumn = async (db, table, column, definition) => {
  const columns = await db.prepare(`PRAGMA table_info(${table})`).all();
  const hasColumn = Array.isArray(columns?.results)
    && columns.results.some((entry) => entry.name === column);
  if (!hasColumn) await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
};

export const ensureAuthSchema = async (db) => {
  for (const statement of authSchemaStatements) {
    await db.prepare(statement).run();
  }

  await ensureOptionalColumn(db, 'profiles', 'company_name', 'TEXT');
  await ensureOptionalColumn(db, 'profiles', 'company_website', 'TEXT');
  await ensureOptionalColumn(db, 'profiles', 'business_context', 'TEXT');
  await ensureOptionalColumn(db, 'profiles', 'password_hash', 'TEXT');
  await ensureOptionalColumn(db, 'profiles', 'password_salt', 'TEXT');
  await ensureOptionalColumn(db, 'profiles', 'password_iterations', 'INTEGER');
  await ensureOptionalColumn(db, 'profiles', 'password_enabled', 'INTEGER NOT NULL DEFAULT 0');
};


const PASSWORD_ITERATIONS = 210000;
const PASSWORD_SALT_BYTES = 16;

const bytesToHex = (bytes) => Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');

const hexToBytes = (hex) => {
  const pairs = String(hex || '').match(/.{1,2}/g) || [];
  return new Uint8Array(pairs.map((pair) => Number.parseInt(pair, 16)));
};

const derivePasswordHash = async (password, saltHex, iterations = PASSWORD_ITERATIONS) => {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: hexToBytes(saltHex), iterations, hash: 'SHA-256' },
    key,
    256,
  );
  return bytesToHex(new Uint8Array(bits));
};

export const hashAccountPassword = async (password) => {
  const salt = new Uint8Array(PASSWORD_SALT_BYTES);
  crypto.getRandomValues(salt);
  const saltHex = bytesToHex(salt);
  const passwordHash = await derivePasswordHash(password, saltHex, PASSWORD_ITERATIONS);
  return { passwordHash, passwordSalt: saltHex, passwordIterations: PASSWORD_ITERATIONS, passwordEnabled: 1 };
};

export const verifyAccountPassword = async (password, profile = {}) => {
  if (!profile?.passwordEnabled || !profile?.passwordHash || !profile?.passwordSalt || !profile?.passwordIterations) return false;
  const passwordHash = await derivePasswordHash(password, profile.passwordSalt, Number(profile.passwordIterations));
  return timingSafeEqual(passwordHash, profile.passwordHash);
};

export const makeId = (prefix) => `${prefix}-${crypto.randomUUID()}`;

export const nowIso = () => new Date().toISOString();

export const requireDb = (env) => {
  if (!env.DB) throw new Error('Missing Cloudflare D1 binding: DB');
  return env.DB;
};

const grantSelect = `
  SELECT id, email, role, note, granted_by_email AS grantedByEmail, status, created_at AS createdAt, updated_at AS updatedAt
  FROM access_grants
`;

export const getGrantByEmail = async (db, email) => {
  if (!email) return null;
  return db.prepare(`${grantSelect} WHERE lower(trim(email)) = ? LIMIT 1`).bind(normalizeEmail(email)).first();
};

export const getActiveGrant = async (db, email) => {
  if (!email) return null;
  return db.prepare(`
    SELECT id, email, role, note, granted_by_email AS grantedByEmail, status, created_at AS createdAt, updated_at AS updatedAt
    FROM access_grants
    WHERE lower(trim(email)) = ? AND status = 'active'
    LIMIT 1
  `).bind(normalizeEmail(email)).first();
};

export const requireAdmin = async (request, env) => {
  const db = requireDb(env);
  const email = await getAccessIdentityEmail(request, env);
  if (!email) return { error: privateErrorJson('Cloudflare Access identity is required.', 401) };

  const grant = await getActiveGrant(db, email);
  if (grant?.role !== 'admin') {
    return { error: privateErrorJson('Admin access grant is required for this API route.', 403) };
  }

  return { db, email, grant };
};

export const getProfileRoleByEmail = async (db, email) => {
  if (!email) return null;
  return db.prepare(`
    SELECT id, email, default_role AS defaultRole, requested_role AS requestedRole, status
    FROM profiles
    WHERE lower(trim(email)) = ?
    LIMIT 1
  `).bind(normalizeEmail(email)).first();
};

export const resolveAccountRole = ({ grant = null, profile = null } = {}) => normalizeRole(
  grant?.role || profile?.defaultRole || 'customer',
);

export const requireAccountRole = async (request, env, roles = []) => {
  const db = requireDb(env);
  const email = await getAccountSessionEmail(request, env);
  if (!email) return { error: privateErrorJson('Verified account session is required.', 401) };

  const [grant, profile] = await Promise.all([
    getActiveGrant(db, email),
    getProfileRoleByEmail(db, email),
  ]);
  const role = resolveAccountRole({ grant, profile });
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  if (!allowedRoles.includes(role) && role !== 'admin') {
    return { error: privateErrorJson(`${allowedRoles.join(' or ')} access grant is required for this API route.`, 403) };
  }

  return { db, email, grant, profile, role };
};

// Cloudflare Pages treats every JavaScript file under /functions as a route.
// This module is primarily shared code, but exporting a handler keeps Pages
// deployment validation happy if it maps /api/_utils during function bundling.
export const onRequest = () => errorJson('Not found.', 404);
