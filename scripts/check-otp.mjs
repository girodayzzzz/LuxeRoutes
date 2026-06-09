import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const loginSource = readFileSync('login.html', 'utf8');
const accountSource = readFileSync('account.js', 'utf8');
const otpSource = readFileSync('functions/api/auth/otp.js', 'utf8');

assert.doesNotMatch(loginSource, /data-login-otp-form|name="otp"|Email me a login code/, 'Login page must not expose the legacy OTP form.');
assert.doesNotMatch(accountSource, /fetch\('\/api\/auth\/otp/, 'Browser login flow must not call the legacy OTP API.');
assert.match(otpSource, /Cloudflare Access/, 'Legacy OTP API should clearly direct clients to Cloudflare Access.');

const tempRoot = mkdtempSync(join(tmpdir(), 'luxeroutes-otp-disabled-'));
cpSync('functions', join(tempRoot, 'functions'), { recursive: true });
writeFileSync(join(tempRoot, 'package.json'), '{"type":"module"}\n');
const otpModule = await import(pathToFileURL(join(tempRoot, 'functions/api/auth/otp.js')));

const requestResponse = await otpModule.onRequestPost({
  request: new Request('https://luxeroutes.test/api/auth/otp', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'traveler@example.com' }),
  }),
  env: {},
});
assert.equal(requestResponse.status, 410, 'Legacy OTP requests should be disabled so Cloudflare Access remains the only identity source.');
assert.match((await requestResponse.json()).error, /Cloudflare Access/, 'Disabled OTP response should tell clients to use Cloudflare Access.');

const logoutResponse = await otpModule.onRequestPost({
  request: new Request('https://luxeroutes.test/api/auth/otp?action=logout', { method: 'POST' }),
  env: {},
});
assert.equal(formResponse.status, 200, 'OTP request should accept standard form submissions as a no-JavaScript fallback.');
assert.equal(sentEmails.at(-1).body.to, 'form@example.com', 'Form fallback should still send the login code through Resend.');


const ownerDb = new FakeDb();
ownerDb.grants.push({ id: 'grant-owner', email: 'owner@example.com', role: 'owner', status: 'active' });
const ownerEnv = { DB: ownerDb, RESEND_API_KEY: 'resend-owner-key' };
const ownerRequestResponse = await otpModule.onRequestPost({ request: makeRequest('owner@example.com'), env: ownerEnv });
assert.equal(ownerRequestResponse.status, 200, 'Owner OTP request should send a Resend code before role routing.');
const ownerCode = sentEmails.at(-1).body.text.match(/\b\d{6}\b/)[0];
const ownerVerifyResponse = await otpModule.onRequestPost({
  request: new Request('https://luxeroutes.test/api/auth/otp?action=verify', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@example.com', otp: ownerCode, remember: true }),
  }),
  env: ownerEnv,
});
const ownerVerifyPayload = await ownerVerifyResponse.json();
assert.equal(ownerVerifyPayload.role, 'owner', 'Owner OTP verification should resolve the active owner grant.');
assert.equal(ownerVerifyPayload.redirect, '/owner-panel.html', 'Owner OTP verification should route to the owner dashboard.');
assert.match(ownerVerifyResponse.headers.get('Set-Cookie') || '', /Max-Age=2592000/, 'Remembered owner OTP verification should set a 30-day cookie.');

const managerDb = new FakeDb();
managerDb.grants.push({ id: 'grant-manager', email: 'manager@example.com', role: 'manager', status: 'active' });
const managerEnv = { DB: managerDb, RESEND_API_KEY: 'resend-manager-key' };
await otpModule.onRequestPost({ request: makeRequest('manager@example.com'), env: managerEnv });
const managerCode = sentEmails.at(-1).body.text.match(/\b\d{6}\b/)[0];
const managerFormVerifyResponse = await otpModule.onRequestPost({
  request: new Request('https://luxeroutes.test/api/auth/otp?action=verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: 'manager@example.com', otp: managerCode }),
  }),
  env: managerEnv,
});
assert.equal(managerFormVerifyResponse.status, 303, 'Manager no-JavaScript OTP verification should redirect after setting the cookie.');
assert.equal(managerFormVerifyResponse.headers.get('Location'), '/manager-panel.html', 'Manager form fallback should route to the manager dashboard.');
assert.match(managerFormVerifyResponse.headers.get('Set-Cookie') || '', /luxeroutes_account_session=.*Max-Age=14400/, 'Manager form fallback should set the default account session cookie.');

const adminDb = new FakeDb();
adminDb.grants.push({ id: 'grant-admin', email: 'admin@example.com', role: 'admin', status: 'active' });
const adminResponse = await otpModule.onRequestPost({ request: makeRequest('admin@example.com'), env: { DB: adminDb, RESEND_API_KEY: 'resend-admin-key' } });
const adminPayload = await adminResponse.json();
assert.equal(adminResponse.status, 200, 'Admin email checks should return a Cloudflare Access redirect response.');
assert.equal(adminPayload.adminAccess, true, 'Admin email checks should identify that Cloudflare Access handles verification.');
assert.equal(adminPayload.redirect, '/admin/index.html', 'Admin email checks should send admins to the protected admin console.');
assert.equal(sentEmails.some((email) => email.body.to === 'admin@example.com'), false, 'Admin email checks should not send a Resend OTP code.');


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

console.log('OTP-disabled Cloudflare Access checks passed.');
