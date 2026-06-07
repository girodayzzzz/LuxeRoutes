import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const tempRoot = mkdtempSync(join(tmpdir(), 'luxeroutes-otp-'));
cpSync('functions', join(tempRoot, 'functions'), { recursive: true });
writeFileSync(join(tempRoot, 'package.json'), '{"type":"module"}\n');
const otpModule = await import(pathToFileURL(join(tempRoot, 'functions/api/auth/otp.js')));

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

  run() {
    if (this.sql.includes('CREATE TABLE IF NOT EXISTS login_otps') || this.sql.includes('CREATE INDEX IF NOT EXISTS')) {
      return { success: true };
    }

    if (this.sql.includes("UPDATE login_otps") && this.sql.includes("status = 'expired'")) {
      const [updatedAt, email, expiresAt] = this.params;
      this.db.otps.forEach((otp) => {
        if (otp.email === email && otp.status === 'pending' && otp.expiresAt <= expiresAt) Object.assign(otp, { status: 'expired', updatedAt });
      });
      return { success: true };
    }

    if (this.sql.includes('DELETE FROM login_otps') && this.sql.includes("status IN ('verified', 'expired', 'locked')")) {
      return { success: true };
    }

    if (this.sql.includes('INSERT INTO login_otps')) {
      const [id, email, otpHash, expiresAt, createdAt, updatedAt] = this.params;
      this.db.otps.unshift({ id, email, otpHash, attempts: 0, status: 'pending', expiresAt, createdAt, updatedAt });
      return { success: true };
    }

    if (this.sql.includes('DELETE FROM login_otps')) {
      const [id] = this.params;
      this.db.otps = this.db.otps.filter((otp) => otp.id !== id);
      return { success: true };
    }

    throw new Error(`Unhandled run SQL: ${this.sql}`);
  }
}

class FakeDb {
  constructor() {
    this.otps = [];
    this.schemaExecutions = [];
  }

  exec() {
    throw new Error('OTP schema should use prepared statements instead of db.exec().');
  }

  prepare(sql) {
    this.schemaExecutions.push(sql);
    return new FakeStatement(this, sql);
  }
}

const makeRequest = (email) => new Request('https://luxeroutes.test/api/auth/otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email }),
});

const db = new FakeDb();
db.otps.push({ id: 'otp-stale', email: 'traveler@example.com', otpHash: 'stale', attempts: 0, status: 'pending', expiresAt: '2020-01-01T00:00:00.000Z', createdAt: '2020-01-01T00:00:00.000Z', updatedAt: '2020-01-01T00:00:00.000Z' });
const env = { DB: db, RESEND_API_KEY: 'resend-test-key', OTP_EMAIL_FROM: 'LuxeRoutes <login@example.com>' };
const originalFetch = globalThis.fetch;
const sentEmails = [];

globalThis.fetch = async (url, init) => {
  sentEmails.push({ url, init, body: JSON.parse(init.body) });
  return new Response(JSON.stringify({ id: 'email-test' }), { status: 200 });
};

const successResponse = await otpModule.onRequestPost({ request: makeRequest('Traveler@Example.com'), env });
assert.equal(successResponse.status, 200, 'OTP request should succeed when email delivery succeeds.');
assert.match(db.schemaExecutions[0], /CREATE TABLE IF NOT EXISTS login_otps/, 'OTP request should ensure its required table exists.');
assert.ok(db.schemaExecutions.includes('CREATE INDEX IF NOT EXISTS idx_login_otps_email_status ON login_otps(email, status)'), 'OTP request should ensure its email/status index exists.');
assert.ok(db.schemaExecutions.includes('CREATE INDEX IF NOT EXISTS idx_login_otps_expires_at ON login_otps(expires_at)'), 'OTP request should ensure its expires_at index exists.');
assert.equal(db.otps.length, 2, 'OTP request should retain the expired audit row and save a new challenge.');
assert.equal(db.otps[0].email, 'traveler@example.com', 'OTP request should normalize the recipient email.');
assert.equal(db.otps.find((otp) => otp.id === 'otp-stale').status, 'expired', 'Requesting a new code should mark stale pending challenges expired.');
assert.equal(sentEmails.length, 1, 'OTP request should call the email provider exactly once.');
assert.equal(sentEmails[0].body.from, 'LuxeRoutes <login@example.com>', 'OTP email should use the configured sender when provided.');
assert.equal(sentEmails[0].body.to, 'traveler@example.com', 'OTP email should be addressed to the login email.');
assert.match(sentEmails[0].body.text, /\b\d{6}\b/, 'OTP email should contain a 6-digit login code.');


const fallbackDb = new FakeDb();
const fallbackEnv = { DB: fallbackDb, RESEND_API_TOKEN: 'resend-alias-key' };
globalThis.fetch = async (url, init) => {
  sentEmails.push({ url, init, body: JSON.parse(init.body) });
  return new Response(JSON.stringify({ id: 'email-fallback' }), { status: 200 });
};
const fallbackResponse = await otpModule.onRequestPost({ request: makeRequest('fallback@example.com'), env: fallbackEnv });
assert.equal(fallbackResponse.status, 200, 'OTP request should accept supported Resend API key aliases.');
assert.equal(sentEmails.at(-1).body.from, 'LuxeRoutes <login@luxeroutes.eu>', 'OTP email should default to the production sender when no sender env is provided.');


const missingSecretDb = new FakeDb();
const missingSecretResponse = await otpModule.onRequestPost({ request: makeRequest('missing-secret@example.com'), env: { DB: missingSecretDb } });
const missingSecretBody = await missingSecretResponse.json();
assert.equal(missingSecretResponse.status, 500, 'OTP request should fail clearly when Resend credentials are missing.');
assert.match(missingSecretBody.error, /Missing RESEND_API_KEY/, 'Missing Resend secret errors should name the required Cloudflare Pages variable.');
assert.match(missingSecretBody.error, /Cloudflare Access protects only \/admin/, 'Missing Resend secret errors should explain the recommended Cloudflare Access scope.');
assert.match(missingSecretBody.error, /not one profile per user/, 'Missing Resend secret errors should clarify that Resend is site-wide, not per user.');
assert.match(missingSecretBody.error, /RESEND_API_TOKEN|RESEND_TOKEN/, 'Missing Resend secret errors should document supported aliases.');
assert.equal(missingSecretDb.otps.length, 0, 'Missing delivery credentials should not leave unusable OTP challenges.');

globalThis.fetch = async () => new Response('provider unavailable', { status: 503 });
const failedResponse = await otpModule.onRequestPost({ request: makeRequest('failed@example.com'), env });
assert.equal(failedResponse.status, 500, 'OTP request should report email provider failures.');
assert.equal(db.otps.some((otp) => otp.email === 'failed@example.com'), false, 'Failed deliveries should not leave unusable OTP challenges.');

globalThis.fetch = originalFetch;
console.log('OTP delivery checks passed.');
