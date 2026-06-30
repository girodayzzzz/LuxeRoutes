const baseUrl = String(process.argv[2] || 'https://luxeroutes.eu').replace(/\/$/, '');

const isHtmlOk = ({ status, contentType, accessRedirect }) => status === 200 && contentType.includes('text/html') && !accessRedirect;
const isExtensionlessRedirect = (target) => ({ status, location, accessRedirect }) => [301, 302, 307, 308].includes(status) && location === target && !accessRedirect;

const checks = [
  {
    name: 'Public login page (.html or canonical redirect)',
    path: '/login.html',
    expect: (result) => isHtmlOk(result) || isExtensionlessRedirect('/login')(result),
    pass: 'login.html is public, or it redirects once to the extensionless /login route.',
    fail: 'login.html should be public HTML or a single /login canonical redirect. Access redirects or other redirects break login.',
  },
  {
    name: 'Public login canonical route',
    path: '/login',
    expect: isHtmlOk,
    pass: 'login is public and serving the login HTML shell.',
    fail: 'login should serve public HTML. If this redirects back to /login.html, it creates a loop with an .html canonical redirect rule.',
  },
  {
    name: 'Public password reset page',
    path: '/reset-password.html',
    expect: isHtmlOk,
    pass: 'reset-password.html is public and serving the password recovery HTML shell.',
    fail: 'reset-password.html should be public HTML so users can recover account access.',
  },
  {
    name: 'Public account shell (.html or canonical redirect)',
    path: '/account.html',
    expect: (result) => isHtmlOk(result) || isExtensionlessRedirect('/account')(result),
    pass: 'account.html is public, or it redirects once to the extensionless /account route.',
    fail: 'account.html should be public HTML or a single /account canonical redirect. Access redirects or other redirects break account loading.',
  },
  {
    name: 'Public account canonical route',
    path: '/account',
    expect: isHtmlOk,
    pass: 'account is public and serving the account HTML shell; client JS handles logged-out redirect to login.',
    fail: 'account should serve public HTML. If this redirects back to /account.html, it creates a loop with an .html canonical redirect rule.',
  },
  {
    name: 'OTP session API',
    path: '/api/auth/otp?action=session',
    headers: { Accept: 'application/json' },
    expect: ({ status, contentType, accessRedirect }) => status === 401 && contentType.includes('application/json') && !accessRedirect,
    pass: 'OTP session API is public and correctly rejects missing signed session cookies.',
    fail: 'OTP session API should return 401 JSON without a cookie. Access redirects or HTML here break login.',
  },
  {
    name: 'Account API',
    path: '/api/account',
    headers: { Accept: 'application/json' },
    expect: ({ status, contentType, accessRedirect }) => status === 401 && contentType.includes('application/json') && !accessRedirect,
    pass: 'Account API is reachable and correctly rejects missing signed sessions.',
    fail: 'Account API should return 401 JSON when logged out. Access redirects or HTML here break account loading.',
  },
  {
    name: 'Admin page Access protection',
    path: '/admin/index.html',
    expect: ({ accessRedirect, status }) => accessRedirect || [401, 403].includes(status),
    pass: 'Admin page appears protected by Cloudflare Access.',
    fail: 'Admin page did not look Access-protected from a clean request. Verify the admin-only Access app destinations.',
    warningOnly: true,
  },
];

const summarizeBody = (body) => body.replace(/\s+/g, ' ').trim().slice(0, 180);

let failures = 0;

for (const check of checks) {
  const url = `${baseUrl}${check.path}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: check.headers || {},
      redirect: 'manual',
    });
    const contentType = response.headers.get('content-type') || '';
    const location = response.headers.get('location') || '';
    const server = response.headers.get('server') || '';
    const body = await response.text().catch(() => '');
    const accessRedirect = response.type === 'opaqueredirect'
      || /cloudflareaccess|cdn-cgi\/access/i.test(`${location}\n${body}`);
    const githubPages = /github|File not found|GitHub Pages/i.test(`${server}\n${body}`);
    const result = {
      status: response.status,
      contentType,
      location,
      server,
      body,
      accessRedirect,
      githubPages,
    };
    const ok = check.expect(result);

    console.log(`\n${ok ? 'PASS' : check.warningOnly ? 'WARN' : 'FAIL'}: ${check.name}`);
    console.log(`URL: ${url}`);
    console.log(`HTTP: ${response.status}`);
    console.log(`Content-Type: ${contentType || 'unknown'}`);
    if (location) console.log(`Location: ${location}`);
    if (server) console.log(`Server: ${server}`);
    if (accessRedirect) console.log('Detected: Cloudflare Access redirect/protection');
    if (githubPages) console.log('Detected: GitHub Pages-style response');
    console.log(ok ? check.pass : check.fail);
    if (!ok && body) console.log(`Body preview: ${summarizeBody(body)}`);

    if (!ok && !check.warningOnly) failures += 1;
  } catch (error) {
    console.log(`\n${check.warningOnly ? 'WARN' : 'FAIL'}: ${check.name}`);
    console.log(`URL: ${url}`);
    console.log(`Error: ${error.message}`);
    if (!check.warningOnly) failures += 1;
  }
}

console.log('\nExpected production shape:');
console.log('- /login.html and /account.html: 200 text/html or one-way 30x to /login and /account');
console.log('- /login and /account: 200 text/html, no redirect back to .html');
console.log('- /api/auth/otp?action=session and /api/account without cookies: 401 application/json, no Cloudflare Access redirect');
console.log('- /admin/index.html: Cloudflare Access redirect/challenge for a clean request');

if (failures > 0) process.exit(1);
