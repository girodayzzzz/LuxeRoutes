import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const adminPanelSource = readFileSync('admin-panel.js', 'utf8');

const accountSource = readFileSync('account.js', 'utf8');
const siteScriptSource = readFileSync('script.js', 'utf8');
assert.match(
  accountSource,
  /const loginRememberInput = document\.querySelector\('\[name="remember"\]'\);/,
  'Login page should wire the remember-me checkbox into session persistence.',
);
assert.match(
  accountSource,
  /localStorage\.setItem\(accountSessionKey, serializedSession\)/,
  'Remembered login sessions should be saved to localStorage.',
);
assert.match(
  accountSource,
  /clearAccountSession[\s\S]*?sessionStorage\.removeItem\(accountSessionKey\);[\s\S]*?localStorage\.removeItem\(accountSessionKey\);/,
  'Logout and expired session cleanup should clear both tab and remembered sessions.',
);
assert.match(
  siteScriptSource,
  /parseAccountSession\(sessionStorage\.getItem\(navAccountSessionKey\)\)[\s\S]*?parseAccountSession\(localStorage\.getItem\(navAccountSessionKey\)\)/,
  'Navigation and private-page guards should restore remembered account sessions.',
);
assert.match(
  adminPanelSource,
  /const currentPanelRole = \(\) => \(isLocalPreview\(\) \? \(roleSelect\?\.value \|\| currentRole\) : currentRole\);/,
  'Production admin role checks must use the verified currentRole instead of the hidden local-preview selector.',
);
assert.match(
  adminPanelSource,
  /if \(isLocalPreview\(\)\) \{[\s\S]*?localPreview: true,[\s\S]*?return true;[\s\S]*?\}/,
  'Localhost admin preview should unlock explicitly with localPreview enabled.',
);
assert.doesNotMatch(
  adminPanelSource,
  /sessionRole === 'admin'[\s\S]*?unlockWorkspace/,
  'Production admin panel must not unlock solely from browser sessionStorage.',
);

const tempRoot = mkdtempSync(join(tmpdir(), 'luxeroutes-auth-admin-'));
cpSync('functions', join(tempRoot, 'functions'), { recursive: true });
writeFileSync(join(tempRoot, 'package.json'), '{"type":"module"}\n');

const accountModule = await import(pathToFileURL(join(tempRoot, 'functions/api/account.js')));
const grantsModule = await import(pathToFileURL(join(tempRoot, 'functions/api/admin/grants.js')));

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
      return this.db.grants.find((grant) => grant.email === email && grant.status === 'active') || null;
    }

    if (sql.includes('FROM access_grants') && sql.includes('WHERE email = ?')) {
      return this.db.grants.find((grant) => grant.email === email) || null;
    }

    if (sql.includes('FROM profiles') && sql.includes('WHERE email = ?')) {
      return this.db.profiles.find((profile) => profile.email === email) || null;
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

    throw new Error(`Unhandled all SQL: ${sql}`);
  }

  run() {
    const sql = this.sql;

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
      const profile = this.db.profiles.find((item) => item.email === email);
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
    this.grants = [{ id: 'grant-admin', email: 'admin@example.com', role: 'admin', note: 'Seed admin', grantedByEmail: 'system', status: 'active', createdAt: '2026-06-03T00:00:00.000Z', updatedAt: '2026-06-03T00:00:00.000Z' }];
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
const registrationPayload = await registrationResponse.json();
assert.equal(registrationPayload.profile.status, 'pending_admin_grant', 'Owner registration should wait for admin approval.');
assert.equal(registrationPayload.role, 'customer', 'Owner registration should keep customer access until approval.');

const forbiddenGrantResponse = await grantsModule.onRequestGet({ request: makeRequest('owner@example.com'), env });
assert.equal(forbiddenGrantResponse.status, 403, 'Non-admin users should not read admin grant data.');

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

console.log('Auth/login and admin-panel checks passed.');
