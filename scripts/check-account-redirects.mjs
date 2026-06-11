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
  accessResponse = new Response('Not found', { status: 404 }),
  storageUnavailable = false,
} = {}) => {
  const redirects = [];
  const assignments = [];
  const body = new FakeElement();
  body.classList = new FakeClassList(bodyClasses);
  body.dataset = { ...bodyDataset };

  const document = {
    body,
    querySelector: () => null,
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
  return { redirects, assignments, fetches, body };
};

const unauthenticatedAccount = await runAccountClient();
assert.deepEqual(
  unauthenticatedAccount.redirects,
  ['login.html?redirect=%2Faccount.html'],
  'Production account.html should redirect unauthenticated visitors to login with the account page as return target.',
);
assert.deepEqual(
  unauthenticatedAccount.fetches.slice(0, 2),
  ['/api/account', '/.cloudflare/access/get-identity'],
  'Account page should check the signed account API first, then the Cloudflare Access identity fallback.',
);

const storageBlockedAccount = await runAccountClient({ storageUnavailable: true });
assert.deepEqual(
  storageBlockedAccount.redirects,
  ['login.html?redirect=%2Faccount.html'],
  'Blocked browser storage should not break the unauthenticated account redirect.',
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
