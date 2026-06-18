import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const accountSource = readFileSync('account.js', 'utf8');

class FakeClassList {
  constructor(classes = []) {
    this.classes = new Set(classes);
  }

  contains(className) {
    return this.classes.has(className);
  }

  remove(className) {
    this.classes.delete(className);
  }

  toggle(className, force) {
    if (force) this.classes.add(className);
    else this.classes.delete(className);
  }
}

class FakeElement {
  constructor() {
    this.classList = new FakeClassList();
    this.dataset = {};
    this.hidden = false;
    this.value = '';
    this.textContent = '';
    this.href = '';
    this.innerHTML = '';
  }

  addEventListener() {}

  querySelector() {
    return null;
  }

  querySelectorAll() {
    return [];
  }

  setAttribute(name, value) {
    this[name] = value;
  }
}

const waitForAccountInitialise = () => new Promise((resolve) => {
  setTimeout(resolve, 20);
});

const makeStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
};

const runAccountClient = async ({
  pathname = '/account.html',
  search = '',
  hostname = 'luxeroutes.eu',
  bodyClasses = ['account-page', 'account-dashboard-page'],
  bodyDataset = { requiredAccountRole: 'customer' },
  accountResponse = new Response(JSON.stringify({ error: 'Verified email is required.' }), { status: 401 }),
  sessionResponse = new Response(JSON.stringify({ error: 'Verified account session is required.' }), { status: 401 }),
  accessResponse = new Response('Not found', { status: 404 }),
  storageUnavailable = false,
} = {}) => {
  const redirects = [];
  const assignments = [];
  const body = new FakeElement();
  body.classList = new FakeClassList(bodyClasses);
  body.dataset = { ...bodyDataset };

  const elements = {
    '[data-account-heading]': new FakeElement(),
    '[data-account-status]': new FakeElement(),
    '[data-account-email]': new FakeElement(),
    '[data-account-role]': new FakeElement(),
    '[data-account-profile]': new FakeElement(),
  };

  const document = {
    body,
    querySelector: (selector) => elements[selector] || null,
    querySelectorAll: () => [],
    addEventListener: () => {},
  };

  const window = {
    document,
    alert: () => {},
    setTimeout,
    clearTimeout,
    location: {
      pathname,
      search,
      hash: '',
      hostname,
      origin: 'https://luxeroutes.eu',
      replace: (target) => redirects.push(target),
      assign: (target) => assignments.push(target),
      href: '',
    },
  };

  if (storageUnavailable) {
    Object.defineProperty(window, 'sessionStorage', { get: () => { throw new Error('sessionStorage blocked'); } });
    Object.defineProperty(window, 'localStorage', { get: () => { throw new Error('localStorage blocked'); } });
  } else {
    window.sessionStorage = makeStorage();
    window.localStorage = makeStorage();
  }

  const fetches = [];
  const context = vm.createContext({
    AbortController,
    FormData,
    URL,
    URLSearchParams,
    Response,
    console,
    crypto,
    document,
    fetch: async (url) => {
      fetches.push(url);
      if (url === '/api/account') return accountResponse.clone();
      if (url === '/api/auth/otp?action=session') return sessionResponse.clone();
      if (url === '/.cloudflare/access/get-identity') return accessResponse.clone();
      if (url === '/api/owner/offers' || url === '/api/manager/offers') {
        return new Response(JSON.stringify({ offers: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url === '/api/owner/inquiries' || url === '/api/manager/inquiries') {
        return new Response(JSON.stringify({ inquiries: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    },
    localStorage: storageUnavailable ? undefined : window.localStorage,
    sessionStorage: storageUnavailable ? undefined : window.sessionStorage,
    setTimeout,
    clearTimeout,
    window,
  });

  vm.runInContext(accountSource, context, { filename: 'account.js' });
  await waitForAccountInitialise();
  return { redirects, assignments, fetches, body, elements };
};

const unauthenticatedAccount = await runAccountClient();
assert.deepEqual(
  unauthenticatedAccount.redirects,
  ['login.html?redirect=%2Faccount.html'],
  'Production account.html should redirect unauthenticated visitors to login with the account page as return target.',
);
assert.deepEqual(
  unauthenticatedAccount.fetches.slice(0, 2),
  ['/api/account', '/api/auth/otp?action=session'],
  'Account page should check the account API first, then the OTP session fallback.',
);

const storageBlockedAccount = await runAccountClient({ storageUnavailable: true });
assert.deepEqual(
  storageBlockedAccount.redirects,
  ['login.html?redirect=%2Faccount.html'],
  'Blocked browser storage should not break the unauthenticated account redirect.',
);


const fallbackSessionResponse = new Response(JSON.stringify({
  identityEmail: 'customer@example.com',
  profile: { email: 'customer@example.com', defaultRole: 'customer', requestedRole: 'customer', status: 'active' },
  grant: null,
  role: 'customer',
  accessStatus: 'active',
}), { status: 200, headers: { 'Content-Type': 'application/json' } });
const accountApiRedirectFallback = await runAccountClient({
  accountResponse: new Response(null, { status: 302, headers: { Location: '/cdn-cgi/access/login' } }),
  sessionResponse: fallbackSessionResponse,
});
assert.deepEqual(
  accountApiRedirectFallback.redirects,
  [],
  'A verified OTP session should keep account.html open even if /api/account is accidentally redirected by Access.',
);
assert.deepEqual(
  accountApiRedirectFallback.fetches.slice(0, 2),
  ['/api/account', '/api/auth/otp?action=session'],
  'The OTP session fallback should run immediately after an unavailable account API response.',
);

const ownerAccountResponse = new Response(JSON.stringify({
  identityEmail: 'owner@example.com',
  profile: { email: 'owner@example.com', defaultRole: 'customer', requestedRole: 'owner', status: 'active' },
  grant: { role: 'owner', status: 'active' },
  role: 'owner',
  accessStatus: 'active',
}), { status: 200, headers: { 'Content-Type': 'application/json' } });
const ownerOnCustomerDashboard = await runAccountClient({ accountResponse: ownerAccountResponse });
assert.deepEqual(
  ownerOnCustomerDashboard.redirects,
  ['owner-panel.html'],
  'Approved owners who open account.html should be routed to owner-panel.html.',
);


const ownerOnOwnerPanel = await runAccountClient({
  pathname: '/owner-panel.html',
  bodyDataset: { requiredAccountRole: 'owner' },
  accountResponse: ownerAccountResponse,
});
assert.deepEqual(ownerOnOwnerPanel.redirects, [], 'Approved owners should stay on owner-panel.html.');
assert.equal(ownerOnOwnerPanel.body.dataset.accountLocked, 'false', 'Approved owners should unlock the owner workspace.');
assert.equal(ownerOnOwnerPanel.elements['[data-account-heading]'].textContent, 'Owner access confirmed', 'Owner panel status heading should confirm owner access.');
assert.equal(ownerOnOwnerPanel.elements['[data-account-email]'].textContent, 'owner@example.com', 'Owner panel should display the verified owner email.');
assert.equal(ownerOnOwnerPanel.elements['[data-account-role]'].textContent, 'Owner', 'Owner panel should display the resolved owner role.');
assert.match(ownerOnOwnerPanel.elements['[data-account-status]'].textContent, /Owner role/, 'Owner panel status should explain active owner access.');

const customerAccountResponse = new Response(JSON.stringify({
  identityEmail: 'customer@example.com',
  profile: { email: 'customer@example.com', defaultRole: 'customer', requestedRole: 'customer', status: 'active' },
  grant: null,
  role: 'customer',
  accessStatus: 'active',
}), { status: 200, headers: { 'Content-Type': 'application/json' } });
const customerOnOwnerPanel = await runAccountClient({
  pathname: '/owner-panel.html',
  bodyDataset: { requiredAccountRole: 'owner' },
  accountResponse: customerAccountResponse,
});
assert.deepEqual(
  customerOnOwnerPanel.redirects,
  ['account.html'],
  'Customers who open owner-panel.html should be routed back to account.html.',
);

const loginPage = await runAccountClient({
  pathname: '/login.html',
  bodyClasses: ['account-page', 'login-page', 'auth-page'],
  bodyDataset: {},
});
assert.deepEqual(loginPage.redirects, [], 'Public login.html should not redirect unauthenticated visitors.');

console.log('Account redirect checks passed.');
