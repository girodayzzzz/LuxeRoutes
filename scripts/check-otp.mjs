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
assert.equal(logoutResponse.status, 200, 'Legacy logout endpoint may still clear old cookies for cleanup.');
assert.match(logoutResponse.headers.get('Set-Cookie') || '', /luxeroutes_account_session=; Path=\/; Max-Age=0/, 'Legacy logout cleanup should expire the old local account cookie.');
assert.equal((await logoutResponse.json()).logout, '/cdn-cgi/access/logout', 'Legacy logout response should point to Cloudflare Access logout.');

console.log('OTP-disabled Cloudflare Access checks passed.');
