const baseUrl = String(process.argv[2] || 'https://luxeroutes.eu').replace(/\/$/, '');
const endpoint = `${baseUrl}/api/offers`;

try {
  const response = await fetch(endpoint, { headers: { Accept: 'application/json' }, redirect: 'follow' });
  const contentType = response.headers.get('content-type') || '';
  const server = response.headers.get('server') || 'unknown';
  const body = await response.text();

  console.log(`URL: ${endpoint}`);
  console.log(`HTTP: ${response.status}`);
  console.log(`Server: ${server}`);
  console.log(`Content-Type: ${contentType || 'unknown'}`);

  if (response.ok && contentType.includes('application/json')) {
    const data = JSON.parse(body);
    if (!Array.isArray(data.offers)) throw new Error('The API returned JSON, but it did not contain an offers array.');
    console.log(`PASS: Cloudflare offers API is available (${data.offers.length} published offer${data.offers.length === 1 ? '' : 's'}).`);
    process.exit(0);
  }

  if (/github|File not found|GitHub Pages/i.test(`${server}\n${body}`)) {
    console.error('FAIL: The domain is being served by GitHub Pages. Cloudflare Pages Functions and D1 APIs cannot run there.');
  } else {
    console.error(`FAIL: Expected a JSON response from ${endpoint}, but received HTTP ${response.status}.`);
  }
  process.exit(1);
} catch (error) {
  console.error(`FAIL: Unable to verify ${endpoint}: ${error.message}`);
  process.exit(1);
}
