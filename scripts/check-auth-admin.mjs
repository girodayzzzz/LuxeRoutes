import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const adminPanelSource = readFileSync('admin-panel.js', 'utf8');

const accountSource = readFileSync('account.js', 'utf8');
const loginSource = readFileSync('login.html', 'utf8');
const siteScriptSource = readFileSync('script.js', 'utf8');
assert.match(loginSource, /data-login-otp-form/, 'Public login should render the branded email one-time-code form.');
assert.match(loginSource, /name="otp"/, 'Public login should include the one-time-code input.');
assert.match(loginSource, /href="register\.html"[^>]*>Create an account<\/a>/, 'Public login should link to the protected registration page.');
assert.match(accountSource, /fetch\('\/api\/auth\/otp'/, 'Primary customer client code must request email one-time codes from the OTP endpoint.');
assert.match(accountSource, /fetch\('\/api\/auth\/otp\?action=verify'/, 'Primary customer client code must verify email one-time codes with the OTP endpoint.');
assert.ok(
  accountSource.indexOf('const identity = await getAccessIdentity();') < accountSource.indexOf('if (!localPreview && isProtectedAccountPage())'),
  'Protected account pages must await Cloudflare Access identity before redirecting a fresh browser session.',
);
assert.match(
  accountSource,
  /email: String\(accountIdentity\?\.email \|\| \(isAccountLocalPreview\(\) \? formData\.get\('email'\) : ''\)/,
  'Production registration must derive its submitted email from the verified account identity.',
);
assert.doesNotMatch(
  siteScriptSource,
  /'account\.html': accountRoles/,
  'Shared navigation code must not redirect account.html before account.js checks Cloudflare Access identity.',
);
assert.doesNotMatch(
  adminPanelSource,
  /isLocalPreview|localStorage|sessionStorage/,
  'The production admin console must not unlock from local preview or browser storage.',
);
assert.match(
  adminPanelSource,
  /requestJson\('\/api\/admin\/grants'\)/,
  'The admin console must load members and applications from the protected D1-backed API.',
);
assert.match(
  adminPanelSource,
  /requestJson\('\/api\/admin\/inquiries'\)/,
  'The admin console must load inquiries from the protected D1-backed API.',
);
assert.match(
  adminPanelSource,
  /requestJson\('\/api\/admin\/session'\)/,
  'Production admin panel must verify its role through the admin-scoped session API.',
);
assert.doesNotMatch(
  adminPanelSource,
  /fetch\('\/api\/account'/,
  'Admin authorization must not depend on the separately protected customer account API.',
);

const tempRoot = mkdtempSync(join(tmpdir(), 'luxeroutes-auth-admin-'));
cpSync('functions', join(tempRoot, 'functions'), { recursive: true });
writeFileSync(join(tempRoot, 'package.json'), '{"type":"module"}\n');

const accountModule = await import(pathToFileURL(join(tempRoot, 'functions/api/account.js')));
const grantsModule = await import(pathToFileURL(join(tempRoot, 'functions/api/admin/grants.js')));
const adminSessionModule = await import(pathToFileURL(join(tempRoot, 'functions/api/admin/session.js')));
const adminInquiriesModule = await import(pathToFileURL(join(tempRoot, 'functions/api/admin/inquiries.js')));
const utilsModule = await import(pathToFileURL(join(tempRoot, 'functions/api/_utils.js')));

class FakeStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.params = [];
  }

  bind(...params) {
    this.params = params;
    return this;
  }

  first() {
    const sql = this.sql;
    const [email] = this.params;

    if (sql.includes('FROM access_grants') && sql.includes("status = 'active'")) {
      return this.db.grants.find((grant) => grant.email.trim().toLowerCase() === email && grant.status === 'active') || null;
    }

    if (sql.includes('FROM access_grants') && sql.includes('WHERE')) {
      return this.db.grants.find((grant) => grant.email.trim().toLowerCase() === email) || null;
    }

    if (sql.includes('FROM profiles') && sql.includes('WHERE')) {
      return this.db.profiles.find((profile) => profile.email.trim().toLowerCase() === email) || null;
    }

    if (sql.includes('FROM inquiries') && sql.includes('WHERE id = ?')) {
      return this.db.inquiries.find((inquiry) => inquiry.id === email) || null;
    }

    throw new Error(`Unhandled first SQL: ${sql}`);
  }

  all() {
    const sql = this.sql;

    if (sql.includes('FROM profiles p')) {
      return {
        results: this.db.profiles.map((profile) => {
          const grant = this.db.grants.find((item) => item.email === profile.email) || {};
          return {
            ...profile,
            grantedRole: grant.role,
            grantNote: grant.note,
            grantStatus: grant.status,
          };
        }),
      };
    }

    if (sql.includes('FROM access_grants')) {
      return { results: [...this.db.grants] };
    }

    if (sql.includes('FROM inquiries')) {
      return { results: [...this.db.inquiries] };
    }

    throw new Error(`Unhandled all SQL: ${sql}`);
  }

  run() {
    const sql = this.sql;

    if (sql.includes('UPDATE inquiries SET status')) {
      const [status, updatedAt, id] = this.params;
      const inquiry = this.db.inquiries.find((item) => item.id === id);
      if (inquiry) Object.assign(inquiry, { status, updatedAt });
      return { success: true };
    }

    if (sql.includes('UPDATE access_grants')) {
      const [email, roleOrNote, noteOrGrantedBy, grantedByOrUpdatedAt, updatedAtOrId, maybeId] = this.params;
      const id = maybeId || updatedAtOrId;
      const grant = this.db.grants.find((item) => item.id === id);
      if (grant) {
        if (maybeId) Object.assign(grant, { email, role: roleOrNote, note: noteOrGrantedBy, grantedByEmail: grantedByOrUpdatedAt, status: 'active', updatedAt: updatedAtOrId });
        else Object.assign(grant, { email, role: 'customer', note: roleOrNote, grantedByEmail: noteOrGrantedBy, status: 'active', updatedAt: grantedByOrUpdatedAt });
      }
      return { success: true };
    }

    if (sql.includes('UPDATE profiles SET email')) {
      const [email, role, updatedAt, id] = this.params;
      const profile = this.db.profiles.find((item) => item.id === id);
      if (profile) Object.assign(profile, { email, defaultRole: role, status: 'active', updatedAt });
      return { success: true };
    }

    if (sql.includes('INSERT INTO profiles') && sql.includes('company_name')) {
      const [id, email, name, requestedRole, companyName, companyWebsite, businessContext, notes, status, createdAt, updatedAt] = this.params;
      const existing = this.db.profiles.find((profile) => profile.email === email);
      const next = {
        id: existing?.id || id,
        email,
        name,
        defaultRole: existing?.defaultRole || 'customer',
        requestedRole,
        companyName,
        companyWebsite,
        businessContext,
        notes,
        status: requestedRole === 'customer' ? 'active' : status,
        createdAt: existing?.createdAt || createdAt,
        updatedAt,
      };
      this.db.upsertProfile(next);
      return { success: true };
    }

    if (sql.includes('INSERT INTO access_grants') && sql.includes('Default customer role')) {
      const [id, email, createdAt, updatedAt] = this.params;
      if (!this.db.grants.some((grant) => grant.email === email)) {
        this.db.grants.unshift({ id, email, role: 'customer', note: 'Default customer role from account registration', grantedByEmail: null, status: 'active', createdAt, updatedAt });
      }
      return { success: true };
    }

    if (sql.includes('UPDATE profiles') && sql.includes("status = 'rejected'")) {
      const [updatedAt, email] = this.params;
      const profile = this.db.profiles.find((item) => item.email.trim().toLowerCase() === email);
      if (profile) Object.assign(profile, { status: 'rejected', defaultRole: 'customer', updatedAt });
      return { success: true };
    }

    if (sql.includes('INSERT INTO access_grants') && sql.includes("'customer'")) {
      const [id, email, note, grantedByEmail, createdAt, updatedAt] = this.params;
      this.db.upsertGrant({ id, email, role: 'customer', note, grantedByEmail, status: 'active', createdAt, updatedAt }, true);
      return { success: true };
    }

    if (sql.includes('INSERT INTO access_grants')) {
      const [id, email, role, note, grantedByEmail, createdAt, updatedAt] = this.params;
      this.db.upsertGrant({ id, email, role, note, grantedByEmail, status: 'active', createdAt, updatedAt });
      return { success: true };
    }

    if (sql.includes('INSERT INTO profiles')) {
      const [id, email, role, createdAt, updatedAt] = this.params;
      const existing = this.db.profiles.find((profile) => profile.email === email);
      this.db.upsertProfile({
        id: existing?.id || id,
        email,
        name: existing?.name || null,
        defaultRole: role,
        requestedRole: existing?.requestedRole || 'customer',
        notes: existing?.notes || null,
        status: 'active',
        createdAt: existing?.createdAt || createdAt,
        updatedAt,
      });
      return { success: true };
    }

    throw new Error(`Unhandled run SQL: ${sql}`);
  }
}

class FakeDb {
  constructor() {
    this.profiles = [];
    this.inquiries = [{ id: 'inquiry-1', inquiryType: 'Owner property application', name: 'Owner Example', email: 'owner@example.com', phone: '', sourcePage: '/partners.html', submittedFrom: 'https://luxeroutes.test/partners.html', payloadJson: '{}', status: 'new', createdAt: '2026-06-03T00:00:00.000Z', updatedAt: '2026-06-03T00:00:00.000Z' }];
    this.grants = [{ id: 'grant-admin', email: 'Admin@Example.com', role: 'admin', note: 'Seed admin', grantedByEmail: 'system', status: 'active', createdAt: '2026-06-03T00:00:00.000Z', updatedAt: '2026-06-03T00:00:00.000Z' }];
  }

  prepare(sql) {
    return new FakeStatement(this, sql);
  }

  upsertProfile(profile) {
    const index = this.profiles.findIndex((item) => item.email === profile.email);
    if (index === -1) this.profiles.unshift(profile);
    else this.profiles[index] = { ...this.profiles[index], ...profile };
  }

  upsertGrant(grant, preserveAdmin = false) {
    const index = this.grants.findIndex((item) => item.email === grant.email);
    if (index === -1) this.grants.unshift(grant);
    else this.grants[index] = {
      ...this.grants[index],
      ...grant,
      role: preserveAdmin && this.grants[index].role === 'admin' ? 'admin' : grant.role,
      id: this.grants[index].id,
      createdAt: this.grants[index].createdAt,
    };
  }
}


const encodeBase64Url = (value) => Buffer.from(value).toString('base64url');
const createAccessJwt = async ({ email, audience = 'admin-aud', issuer = 'https://team.cloudflareaccess.com', kid = 'test-key' }) => {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  );
  const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  publicJwk.kid = kid;
  publicJwk.alg = 'RS256';
  publicJwk.use = 'sig';

  const now = Math.floor(Date.now() / 1000);
  const encodedHeader = encodeBase64Url(JSON.stringify({ typ: 'JWT', alg: 'RS256', kid }));
  const encodedPayload = encodeBase64Url(JSON.stringify({ iss: issuer, aud: [audience], email, iat: now, nbf: now - 10, exp: now + 600 }));
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    keyPair.privateKey,
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
  );
  return { token: `${encodedHeader}.${encodedPayload}.${Buffer.from(signature).toString('base64url')}`, publicJwk };
};

const makeJwtRequest = (token) => new Request('https://luxeroutes.test/api/admin/session', {
  headers: { 'Cf-Access-Jwt-Assertion': token },
});

const makeRequest = (email, body = null) => new Request('https://luxeroutes.test/api/check', {
  method: body ? 'POST' : 'GET',
  headers: {
    ...(email ? { 'CF-Access-Authenticated-User-Email': email } : {}),
    ...(body ? { 'Content-Type': 'application/json' } : {}),
  },
  body: body ? JSON.stringify(body) : undefined,
});

const db = new FakeDb();
const env = { DB: db };

const noIdentityResponse = await accountModule.onRequestGet({ request: makeRequest(''), env });
assert.equal(noIdentityResponse.status, 401, 'Account API should require a verified identity email.');
assert.equal(noIdentityResponse.headers.get('Cache-Control'), 'no-store', 'Sensitive account errors must not be cached.');

const noAdminIdentityResponse = await adminSessionModule.onRequestGet({ request: makeRequest(''), env });
assert.equal(noAdminIdentityResponse.status, 401, 'Admin session API should require a Cloudflare Access identity.');

const adminSessionResponse = await adminSessionModule.onRequestGet({ request: makeRequest('ADMIN@example.com'), env });
assert.equal(adminSessionResponse.status, 200, 'Active admin grant should unlock the admin session.');
assert.deepEqual(await adminSessionResponse.json(), { email: 'admin@example.com', role: 'admin' }, 'Admin session should return the normalized verified identity and D1 role.');

const originalFetch = globalThis.fetch;
const { token: adminAccessToken, publicJwk } = await createAccessJwt({ email: 'ADMIN@example.com' });
globalThis.fetch = async (url) => {
  assert.equal(String(url), 'https://team.cloudflareaccess.com/cdn-cgi/access/certs', 'Access JWT validation should fetch signing keys from the configured team domain.');
  return new Response(JSON.stringify({ keys: [publicJwk] }), { headers: { 'Content-Type': 'application/json' } });
};
const jwtAdminSessionResponse = await adminSessionModule.onRequestGet({
  request: makeJwtRequest(adminAccessToken),
  env: { ...env, CLOUDFLARE_ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com', CLOUDFLARE_ACCESS_AUD: 'admin-aud' },
});
globalThis.fetch = originalFetch;
assert.equal(jwtAdminSessionResponse.status, 200, 'Admin session should accept a verified Cloudflare Access JWT assertion when the email header is absent.');
assert.deepEqual(await jwtAdminSessionResponse.json(), { email: 'admin@example.com', role: 'admin' }, 'Verified Access JWT email should unlock the D1 admin role.');

const missingJwtConfigResponse = await adminSessionModule.onRequestGet({ request: makeJwtRequest(adminAccessToken), env });
assert.equal(missingJwtConfigResponse.status, 500, 'Access JWT fallback must fail closed when validation configuration is missing.');
assert.match((await missingJwtConfigResponse.json()).error, /CLOUDFLARE_ACCESS_TEAM_DOMAIN/, 'Missing Access JWT configuration should be actionable.');

const nonAdminSessionResponse = await adminSessionModule.onRequestGet({ request: makeRequest('owner@example.com'), env });
assert.equal(nonAdminSessionResponse.status, 403, 'An email without an active admin grant must not unlock the admin panel.');
const nonAdminSessionPayload = await nonAdminSessionResponse.json();
assert.equal(nonAdminSessionPayload.email, 'owner@example.com', 'Rejected admin checks should identify which verified email needs a D1 admin grant.');

const registrationResponse = await accountModule.onRequestPost({
  request: makeRequest('owner@example.com', {
    name: 'Owner Example',
    requestedRole: 'owner',
    companyName: 'Example Villas',
    companyWebsite: 'https://example.com',
    businessContext: 'Three villas',
  }),
  env,
});
assert.equal(registrationResponse.status, 201, 'Owner registration should save successfully.');
assert.equal(registrationResponse.headers.get('Cache-Control'), 'no-store', 'Sensitive account responses must not be cached.');
const registrationPayload = await registrationResponse.json();
assert.equal(registrationPayload.profile.status, 'pending_admin_grant', 'Owner registration should wait for admin approval.');
assert.equal(registrationPayload.role, 'customer', 'Owner registration should keep customer access until approval.');

const sessionCookie = await utilsModule.createAccountSessionCookie({ AUTH_SESSION_SECRET: 'test-secret' }, 'OWNER@example.com');
assert.match(sessionCookie, /luxeroutes_account_session=.*HttpOnly; Secure; SameSite=Lax/, 'OTP login should create a secure account session cookie.');
const sessionCookieHeader = sessionCookie.split(';')[0];
const cookieEmail = await utilsModule.getAccountSessionEmail(new Request('https://luxeroutes.test/api/account', {
  headers: { Cookie: sessionCookieHeader },
}), { AUTH_SESSION_SECRET: 'test-secret' });
assert.equal(cookieEmail, 'owner@example.com', 'Account session cookie should restore the verified email.');

const cookieAccountResponse = await accountModule.onRequestGet({
  request: new Request('https://luxeroutes.test/api/account', { headers: { Cookie: sessionCookieHeader } }),
  env: { DB: db, AUTH_SESSION_SECRET: 'test-secret' },
});
assert.equal(cookieAccountResponse.status, 200, 'Account API should accept a verified OTP account session cookie.');
assert.equal((await cookieAccountResponse.json()).identityEmail, 'owner@example.com', 'OTP account sessions should restore the normalized account email.');

const mismatchedRegistrationResponse = await accountModule.onRequestPost({
  request: makeRequest('owner@example.com', { email: 'attacker@example.com', name: 'Wrong Email' }),
  env,
});
assert.equal(mismatchedRegistrationResponse.status, 403, 'Registration must reject a submitted email that differs from the verified account identity.');
assert.equal(db.profiles.some((profile) => profile.email === 'attacker@example.com'), false, 'Registration must never save a profile for an unverified submitted email.');

const forbiddenGrantResponse = await grantsModule.onRequestGet({ request: makeRequest('owner@example.com'), env });
assert.equal(forbiddenGrantResponse.status, 403, 'Non-admin users should not read admin grant data.');

const forbiddenInquiryResponse = await adminInquiriesModule.onRequestGet({ request: makeRequest('owner@example.com'), env });
assert.equal(forbiddenInquiryResponse.status, 403, 'Non-admin users should not read inquiry data.');

const inquiryListResponse = await adminInquiriesModule.onRequestGet({ request: makeRequest('admin@example.com'), env });
assert.equal(inquiryListResponse.status, 200, 'Admins should be able to load production inquiries.');
assert.equal(inquiryListResponse.headers.get('Cache-Control'), 'no-store', 'Sensitive admin responses must not be cached.');
assert.equal((await inquiryListResponse.json()).inquiries.length, 1, 'Admin inquiry list should return D1 inquiries.');

const inquiryPatchResponse = await adminInquiriesModule.onRequestPatch({
  request: new Request('https://luxeroutes.test/api/admin/inquiries', {
    method: 'PATCH',
    headers: { 'CF-Access-Authenticated-User-Email': 'admin@example.com', 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'inquiry-1', status: 'in_progress' }),
  }),
  env,
});
assert.equal(inquiryPatchResponse.status, 200, 'Admins should be able to update inquiry status.');
assert.equal((await inquiryPatchResponse.json()).inquiry.status, 'in_progress', 'Inquiry status updates should persist.');

const invalidInquiryPatchResponse = await adminInquiriesModule.onRequestPatch({
  request: new Request('https://luxeroutes.test/api/admin/inquiries', {
    method: 'PATCH',
    headers: { 'CF-Access-Authenticated-User-Email': 'admin@example.com', 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'inquiry-1', status: 'deleted' }),
  }),
  env,
});
assert.equal(invalidInquiryPatchResponse.status, 400, 'Inquiry status must be restricted to the supported workflow.');

const approveResponse = await grantsModule.onRequestPost({
  request: makeRequest('admin@example.com', { email: 'owner@example.com', role: 'owner', note: 'Approved in smoke test', action: 'approve' }),
  env,
});
assert.equal(approveResponse.status, 201, 'Seeded admin should be able to approve owner access.');
const approvePayload = await approveResponse.json();
assert.equal(approvePayload.grant.role, 'owner', 'Approval should promote grant role to owner.');
assert.equal(approvePayload.profile.status, 'active', 'Approval should activate the profile.');

const rejectResponse = await grantsModule.onRequestPost({
  request: makeRequest('admin@example.com', { email: 'owner@example.com', role: 'owner', note: 'Rejected in smoke test', action: 'reject' }),
  env,
});
assert.equal(rejectResponse.status, 200, 'Seeded admin should be able to reject owner access.');
const rejectPayload = await rejectResponse.json();
assert.equal(rejectPayload.grant.role, 'customer', 'Rejection should return access to customer.');
assert.equal(rejectPayload.profile.status, 'rejected', 'Rejection should mark the profile rejected.');

const selfDowngradeResponse = await grantsModule.onRequestPost({
  request: makeRequest('admin@example.com', { email: 'admin@example.com', role: 'customer', action: 'approve' }),
  env,
});
assert.equal(selfDowngradeResponse.status, 400, 'An admin must not be able to remove their own admin access.');

db.grants.push({ id: 'grant-second-admin', email: 'second-admin@example.com', role: 'admin', note: '', grantedByEmail: 'system', status: 'active', createdAt: '2026-06-03T00:00:00.000Z', updatedAt: '2026-06-03T00:00:00.000Z' });
const rejectAdminResponse = await grantsModule.onRequestPost({
  request: makeRequest('admin@example.com', { email: 'second-admin@example.com', role: 'customer', action: 'reject' }),
  env,
});
assert.equal(rejectAdminResponse.status, 400, 'Reject workflow must not leave an active admin grant with a rejected profile.');

db.grants.push({ id: 'grant-mixed-owner', email: 'Mixed.Owner@Example.com', role: 'owner', note: '', grantedByEmail: 'system', status: 'active', createdAt: '2026-06-03T00:00:00.000Z', updatedAt: '2026-06-03T00:00:00.000Z' });
const mixedCaseUpdateResponse = await grantsModule.onRequestPost({
  request: makeRequest('admin@example.com', { email: 'mixed.owner@example.com', role: 'manager', action: 'approve' }),
  env,
});
assert.equal(mixedCaseUpdateResponse.status, 201, 'Role updates should find existing grants case-insensitively.');
assert.equal(db.grants.filter((grant) => grant.email.toLowerCase() === 'mixed.owner@example.com').length, 1, 'Case-insensitive role updates must not create duplicate grants.');
assert.equal(db.grants.find((grant) => grant.id === 'grant-mixed-owner').role, 'manager', 'Case-insensitive role updates should update the existing grant.');

console.log('Auth/login and admin-panel checks passed.');
