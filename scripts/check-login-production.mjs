const baseUrl = String(process.argv[2] || 'https://luxeroutes.eu').replace(/\/$/, '');

const checks = [
  {
    name: 'Public login page',
    path: '/login.html',
    expect: ({ status, contentType, accessRedirect }) => status === 200 && contentType.includes('text/html') && !accessRedirect,
    pass: 'login.html is public and serving HTML.',
    fail: 'login.html should be public HTML. If this is an Access redirect, remove login routes from Cloudflare Access.',
  },
  {
    name: 'Public account shell',
    path: '/account.html',
    expect: ({ status, contentType, accessRedirect }) => status === 200 && contentType.includes('text/html') && !accessRedirect,
    pass: 'account.html static shell is public; client JS can redirect logged-out users to login.',
    fail: 'account.html should be public HTML. Logged-out redirect is handled by account.js, not Cloudflare Access.',
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
console.log('- /login.html and /account.html: 200 text/html, no Cloudflare Access redirect');
console.log('- /api/auth/otp?action=session and /api/account without cookies: 401 application/json, no Cloudflare Access redirect');
console.log('- /admin/index.html: Cloudflare Access redirect/challenge for a clean request');

if (failures > 0) process.exit(1);
