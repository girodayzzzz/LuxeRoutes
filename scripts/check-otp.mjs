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
    if (this.sql.includes('INSERT INTO login_otps')) {
      const [id, email, otpHash, expiresAt, createdAt, updatedAt] = this.params;
      this.db.otps.unshift({ id, email, otpHash, expiresAt, createdAt, updatedAt });
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

  exec(sql) {
    this.schemaExecutions.push(sql);
    return { count: 0, duration: 0 };
  }

  prepare(sql) {
    return new FakeStatement(this, sql);
  }
}

const makeRequest = (email) => new Request('https://luxeroutes.test/api/auth/otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email }),
});

const db = new FakeDb();
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
assert.equal(db.otps.length, 1, 'OTP request should save a verifiable challenge.');
assert.equal(db.otps[0].email, 'traveler@example.com', 'OTP request should normalize the recipient email.');
assert.equal(sentEmails.length, 1, 'OTP request should call the email provider exactly once.');
assert.equal(sentEmails[0].body.to, 'traveler@example.com', 'OTP email should be addressed to the login email.');
assert.match(sentEmails[0].body.text, /\b\d{6}\b/, 'OTP email should contain a 6-digit login code.');

globalThis.fetch = async () => new Response('provider unavailable', { status: 503 });
const failedResponse = await otpModule.onRequestPost({ request: makeRequest('failed@example.com'), env });
assert.equal(failedResponse.status, 500, 'OTP request should report email provider failures.');
assert.equal(db.otps.some((otp) => otp.email === 'failed@example.com'), false, 'Failed deliveries should not leave unusable OTP challenges.');

globalThis.fetch = originalFetch;
console.log('OTP delivery checks passed.');
