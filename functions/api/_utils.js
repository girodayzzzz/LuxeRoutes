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

const ACCOUNT_SESSION_COOKIE = 'luxeroutes_account_session';
const ACCOUNT_SESSION_TTL_SECONDS = 4 * 60 * 60;
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

export const createAccountSessionCookie = async (env, email) => {
  const normalizedEmail = normalizeEmail(email);
  const secret = getAccountSessionSecret(env);
  if (!secret || !normalizedEmail) return null;

  const expiresAt = Date.now() + (ACCOUNT_SESSION_TTL_SECONDS * 1000);
  const payload = base64UrlEncode(JSON.stringify({ email: normalizedEmail, expiresAt }));
  const signature = await signAccountSessionPayload(payload, secret);
  const token = `${payload}.${signature}`;

  return `${ACCOUNT_SESSION_COOKIE}=${token}; Path=/; Max-Age=${ACCOUNT_SESSION_TTL_SECONDS}; HttpOnly; Secure; SameSite=Lax`;
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
    WHERE lower(trim(email)) = ? AND status = 'active'
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

// Cloudflare Pages treats every JavaScript file under /functions as a route.
// This module is primarily shared code, but exporting a handler keeps Pages
// deployment validation happy if it maps /api/_utils during function bundling.
export const onRequest = () => errorJson('Not found.', 404);
