const accountStatus = document.querySelector('[data-account-status]');
const accountHeading = document.querySelector('[data-account-heading]');
const accountEmail = document.querySelector('[data-account-email]');
const accountRole = document.querySelector('[data-account-role]');
const accountForm = document.querySelector('[data-account-form]');
const accountEmailInput = document.querySelector('[data-account-email-input]');
const accountProfile = document.querySelector('[data-account-profile]');
const accountLoginLink = document.querySelector('[data-account-login-link]');
const loginAccountState = document.querySelector('[data-login-account-state]');
const loginAccountLink = document.querySelector('[data-login-account-link]');
const loginActions = document.querySelector('[data-login-actions]');
const loginSessionStatus = document.querySelector('[data-login-session-status]');
const loginBoxHead = document.querySelector('.login-box-head');
const loginSecurityList = document.querySelector('.login-security-list');
const accountSwitchLink = document.querySelector('.account-switch-link');
const accountLogoutButtons = document.querySelectorAll('[data-account-logout]');
const ownerOffersTarget = document.querySelector('[data-owner-offers]');
const managerOffersTarget = document.querySelector('[data-manager-offers]');
const ownerRequestsTarget = document.querySelector('[data-owner-requests]');
const managerRequestsTarget = document.querySelector('[data-manager-requests]');
const loginOtpForm = document.querySelector('[data-login-otp-form]');
const loginEmailStep = document.querySelector('[data-login-email-step]');
const loginCodeStep = document.querySelector('[data-login-code-step]');
const loginEmailInput = document.querySelector('[data-login-email-input]');
const loginCodeInput = document.querySelector('[data-login-code-input]');
const loginRememberInput = document.querySelector('[data-login-remember-input]');
const loginOtpEmail = document.querySelector('[data-login-otp-email]');
const loginOtpMessage = document.querySelector('[data-login-otp-message]');
const loginOtpBack = document.querySelector('[data-login-otp-back]');
const isRegisterPage = () => document.body.classList.contains('account-page') && Boolean(accountForm);
const isDashboardPage = () => document.body.classList.contains('account-dashboard-page');
const isProtectedAccountPage = () => isDashboardPage();
const isLoginPage = () => document.body.classList.contains('login-page');

if (document.body.classList.contains('account-dashboard-page')) {
  document.body.classList.remove('admin-page');
}
const accountStorageKey = 'luxeroutes-account-profile-v1';
const accountSessionKey = 'luxeroutes-account-session-v1';
const accountSessionTtlMs = 4 * 60 * 60 * 1000;
const accountRememberedSessionTtlMs = 30 * 24 * 60 * 60 * 1000;
const accountAuthFetchTimeoutMs = 8000;
const accountDashboardRoles = ['customer', 'owner', 'manager', 'admin', 'partner'];
const accountRoleHomePaths = {
  customer: 'account.html',
  owner: 'owner-panel.html',
  manager: 'manager-panel.html',
  admin: 'admin/index.html',
};
let accountIdentity = null;
let accountApiEnabled = false;

const accountEscapeHtml = (value) => String(value || '').replace(/[&<>"]/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
}[character]));


const getBrowserStorage = (storageName) => {
  try {
    return window[storageName] || null;
  } catch (error) {
    return null;
  }
};

const storageGet = (storageName, key) => {
  try {
    return getBrowserStorage(storageName)?.getItem(key) || null;
  } catch (error) {
    return null;
  }
};

const storageSet = (storageName, key, value) => {
  try {
    getBrowserStorage(storageName)?.setItem(key, value);
  } catch (error) {
    // The signed HttpOnly account cookie remains the source of truth when
    // browser storage is unavailable.
  }
};

const storageRemove = (storageName, key) => {
  try {
    getBrowserStorage(storageName)?.removeItem(key);
  } catch (error) {
    // Ignore unavailable browser storage and continue with server-side session checks.
  }
};

const fetchAccountAuth = async (url, options = {}) => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), accountAuthFetchTimeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }
};

const isAccountLocalPreview = () => ['localhost', '127.0.0.1', ''].includes(window.location.hostname);

const isSessionFresh = (session) => Boolean(session?.expiresAt && Date.now() < session.expiresAt);

const normalizeAccountRole = (role) => (accountDashboardRoles.includes(role) ? role : 'customer');

const getRoleHomePath = (role) => accountRoleHomePaths[normalizeAccountRole(role)] || accountRoleHomePaths.customer;

const getRequiredAccountRole = () => document.body.dataset.requiredAccountRole || '';

const getDashboardWorkspaceHash = () => {
  const requiredRole = getRequiredAccountRole();
  return {
    customer: '#account-workspace',
    owner: '#owner-workspace',
    manager: '#manager-workspace',
  }[requiredRole] || '#account-workspace';
};

const isRoleAllowedOnPage = (role) => {
  const requiredRole = getRequiredAccountRole();
  if (!requiredRole) return true;
  const normalizedRole = normalizeAccountRole(role);
  return normalizedRole === requiredRole || normalizedRole === 'admin';
};

const redirectToRoleHomeIfNeeded = (role) => {
  if (!isProtectedAccountPage() || isRegisterPage()) return false;
  if (isRoleAllowedOnPage(role)) return false;
  window.location.replace(getRoleHomePath(role));
  return true;
};

const hasVerifiedAccountSession = (session) => Boolean(isSessionFresh(session) && (session?.identity?.email || session?.profile?.email));

const lockDashboard = () => {
  if (isDashboardPage()) document.body.dataset.accountLocked = 'true';
};

const unlockDashboard = () => {
  if (isDashboardPage()) document.body.dataset.accountLocked = 'false';
};

const getCurrentAccountTarget = () => `${window.location.pathname}${window.location.search}${window.location.hash}`;

const isLoginRedirectTarget = (path) => ['/login', '/login.html'].includes(String(path || '').replace(/\/$/, ''));

const getDashboardRoleForPath = (path) => {
  const normalizedPath = String(path || '').replace(/\/$/, '') || '/account.html';
  const fileName = normalizedPath.split('/').filter(Boolean).pop() || 'account.html';
  if (fileName === 'owner-panel.html') return 'owner';
  if (fileName === 'manager-panel.html') return 'manager';
  if (normalizedPath === '/admin' || normalizedPath === '/admin/index.html' || fileName === 'admin-panel.html') return 'admin';
  if (fileName === 'account.html' || normalizedPath === '/account') return 'customer';
  return '';
};

const normalizeRedirectPath = (path) => String(path || '').replace(/^\/+/, '') || 'account.html';

const redirectToLogin = () => {
  if (!isProtectedAccountPage()) return;
  lockDashboard();
  const target = getCurrentAccountTarget();
  window.location.replace(`login.html?redirect=${encodeURIComponent(target)}`);
};

const clearAccountSession = () => {
  storageRemove('sessionStorage', accountSessionKey);
  storageRemove('localStorage', accountSessionKey);
  storageRemove('sessionStorage', accountStorageKey);
  storageRemove('localStorage', accountStorageKey);
};

const parseStoredAccountSession = (stored) => {
  if (!stored) return null;

  try {
    const session = JSON.parse(stored);
    return isSessionFresh(session) ? session : null;
  } catch (error) {
    // Ignore invalid browser cache and start a clean session.
    return null;
  }
};

const loadAccountSession = () => {
  const sessionSession = parseStoredAccountSession(storageGet('sessionStorage', accountSessionKey));
  const rememberedSession = parseStoredAccountSession(storageGet('localStorage', accountSessionKey));
  const session = sessionSession || rememberedSession;

  if (!session) clearAccountSession();
  return session;
};


const saveAccountSession = ({ identity = accountIdentity, profile = null, grant = null, role = null, remember = false } = {}) => {
  if (!identity?.email && !profile?.email) return;

  const shouldRemember = remember || Boolean(parseStoredAccountSession(storageGet('localStorage', accountSessionKey)));
  const serializedSession = JSON.stringify({
    identity,
    profile,
    grant,
    role: normalizeAccountRole(role || grant?.role || profile?.defaultRole || profile?.requestedRole),
    remembered: shouldRemember,
    savedAt: Date.now(),
    expiresAt: Date.now() + (shouldRemember ? accountRememberedSessionTtlMs : accountSessionTtlMs),
  });

  storageSet('sessionStorage', accountSessionKey, serializedSession);
  if (shouldRemember) storageSet('localStorage', accountSessionKey, serializedSession);
  else storageRemove('localStorage', accountSessionKey);
};

const accountStatusLabel = (status) => ({
  active: 'Active',
  pending_admin_grant: 'Pending admin approval',
  rejected: 'Owner/manager request rejected',
}[status] || status || 'Pending admin approval');

const accountStatusClass = (status) => {
  if (status === 'active') return 'status-approved';
  if (status === 'rejected') return 'status-warning';
  return 'status-pending';
};

const getAccessIdentity = async () => {
  try {
    const response = await fetchAccountAuth('/.cloudflare/access/get-identity', {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
      redirect: 'manual',
    });

    if (!response.ok) return null;
    const identity = await response.json();
    return identity?.email ? identity : null;
  } catch (error) {
    return null;
  }
};

const loadAccountProfile = () => {
  const stored = storageGet('localStorage', accountStorageKey);
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch (error) {
    return null;
  }
};

const saveAccountProfile = (profile) => {
  storageSet('localStorage', accountStorageKey, JSON.stringify(profile));
};

const loadRemoteAccountProfile = async () => {
  try {
    const response = await fetchAccountAuth('/api/account', {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
      redirect: 'manual',
    });

    if (!response.ok) return null;

    const data = await response.json();
    accountApiEnabled = true;
    return data;
  } catch (error) {
    return null;
  }
};

const saveRemoteAccountProfile = async (profile) => {
  const response = await fetchAccountAuth('/api/account', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin',
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    const message = await response.json().catch(() => ({}));
    throw new Error(message.error || 'Unable to save your profile right now.');
  }

  accountApiEnabled = true;
  return response.json();
};


const setLoginOtpMessage = (message = '', tone = 'pending') => {
  if (!loginOtpMessage) return;
  loginOtpMessage.textContent = message;
  loginOtpMessage.classList.toggle('status-approved', tone === 'success');
  loginOtpMessage.classList.toggle('status-warning', tone === 'error');
  loginOtpMessage.classList.toggle('status-pending', tone !== 'success' && tone !== 'error');
};

const showLoginCodeStep = (email) => {
  if (loginOtpForm) loginOtpForm.action = '/api/auth/otp?action=verify';
  if (loginEmailStep) loginEmailStep.hidden = true;
  if (loginCodeStep) loginCodeStep.hidden = false;
  if (loginOtpEmail) loginOtpEmail.textContent = email;
  if (loginCodeInput) loginCodeInput.required = true;
  loginCodeInput?.focus();
};

const showLoginEmailStep = () => {
  if (loginOtpForm) loginOtpForm.action = '/api/auth/otp';
  if (loginEmailStep) loginEmailStep.hidden = false;
  if (loginCodeStep) loginCodeStep.hidden = true;
  if (loginCodeInput) {
    loginCodeInput.required = false;
    loginCodeInput.value = '';
  }
  loginEmailInput?.focus();
};

const setLoginOtpBusy = (busy = false) => {
  loginOtpForm?.querySelectorAll('button').forEach((button) => {
    button.disabled = busy;
  });
  if (loginOtpForm) loginOtpForm.setAttribute('aria-busy', busy ? 'true' : 'false');
};

const requestLoginOtp = async (email) => {
  const response = await fetch('/api/auth/otp', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ email }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Unable to send the login code right now.');
  return data;
};

const verifyLoginOtp = async (email, otp, remember = false) => {
  const response = await fetch('/api/auth/otp?action=verify', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ email, otp, remember }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Unable to verify the login code right now.');
  return data;
};

const logoutRemoteAccountSession = async () => {
  try {
    await fetch('/api/auth/otp?action=logout', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    });
  } catch (error) {
    // Local browser state is still cleared even if the remote cookie already expired.
  }
};

const getLoginRedirectTarget = (account = {}) => {
  const role = getAccountRole(account);
  const roleHome = normalizeRedirectPath(account.redirect || getRoleHomePath(role));
  const redirect = new URLSearchParams(window.location.search).get('redirect');
  if (!redirect) return roleHome;

  try {
    const url = new URL(redirect, window.location.origin);
    if (url.origin !== window.location.origin || isLoginRedirectTarget(url.pathname)) return roleHome;

    const redirectRole = getDashboardRoleForPath(url.pathname);
    if (redirectRole) {
      const normalizedRole = normalizeAccountRole(role);
      if (redirectRole === 'customer' && normalizedRole !== 'customer') return roleHome;
      if (normalizedRole !== 'admin' && redirectRole !== normalizedRole) return roleHome;
    }

    return normalizeRedirectPath(`${url.pathname}${url.search}${url.hash}`);
  } catch (error) {
    return roleHome;
  }
};

const getAccountRole = (sessionOrAccount = {}) => normalizeAccountRole(sessionOrAccount?.role
  || sessionOrAccount?.grant?.role
  || sessionOrAccount?.profile?.defaultRole
  || sessionOrAccount?.profile?.requestedRole);

const updateAccountAccessCards = (role = 'customer') => {
  const normalizedRole = normalizeAccountRole(role);

  document.querySelectorAll('[data-account-role-link]').forEach((card) => {
    card.hidden = normalizedRole !== 'admin' && card.dataset.accountRoleLink !== normalizedRole;
  });

  document.querySelectorAll('[data-account-role-panel]').forEach((panel) => {
    panel.hidden = normalizedRole !== 'admin' && panel.dataset.accountRolePanel !== normalizedRole;
  });
};

const updateAccountLogout = (active = false) => {
  accountLogoutButtons.forEach((button) => {
    button.hidden = !active;
  });
};

const logoutAccount = async () => {
  clearAccountSession();
  accountIdentity = null;
  updateAccountAccessCards();
  updateAccountLogout(false);
  await logoutRemoteAccountSession();
  window.location.href = 'login.html?logged_out=1';
};

const updateAccountNav = ({ email = '', role = '', active = false } = {}) => {
  const accountHref = getRoleHomePath(role);
  document.querySelectorAll('[data-nav-login]').forEach((link) => {
    link.hidden = active;
    link.textContent = 'Login';
    link.href = 'login.html';
    link.setAttribute('aria-label', 'Login to LuxeRoutes');
  });

  document.querySelectorAll('[data-nav-account]').forEach((link) => {
    link.hidden = !active;
    link.textContent = 'Account';
    link.href = accountHref;
    link.setAttribute('aria-label', active
      ? `Open LuxeRoutes account for ${email || role || 'signed-in user'}`
      : 'Open LuxeRoutes account dashboard');
  });
};

const setLoginAccountState = (active = false) => {
  if (!isLoginPage()) return;

  [loginBoxHead, loginActions, loginSecurityList, loginSessionStatus, accountSwitchLink].forEach((element) => {
    if (element) element.hidden = active;
  });
  if (loginAccountState) {
    loginAccountState.hidden = !active;
    const openAccountLink = loginAccountState.querySelector('a.btn');
    if (openAccountLink && accountIdentity?.role) openAccountLink.href = getRoleHomePath(accountIdentity.role);
  }
};


const offerStatusLabel = (offer = {}) => accountEscapeHtml(offer.partnerStatus || offer.status || 'pending_review').replaceAll('_', ' ');

const dateRangeLabel = (offer = {}) => {
  const from = offer.availableFrom || '';
  const to = offer.availableTo || '';
  if (from && to) return `Available ${from} to ${to}`;
  if (from) return `Available from ${from}`;
  if (to) return `Available until ${to}`;
  return 'Availability not set yet';
};

const parseInquiryPayload = (inquiry = {}) => {
  try {
    return JSON.parse(inquiry.payloadJson || '{}') || {};
  } catch (error) {
    return {};
  }
};

const getInquiryContact = (inquiry = {}, payload = {}) => inquiry.email || inquiry.phone || payload.email || payload.phone || payload.whatsapp || 'No contact provided';

const renderRoleRequests = (target, inquiries = [], emptyMessage = 'No customer requests yet.') => {
  if (!target) return;
  if (!inquiries.length) {
    target.innerHTML = `<p class="empty-state">${accountEscapeHtml(emptyMessage)}</p>`;
    return;
  }

  target.innerHTML = inquiries.map((inquiry) => {
    const payload = parseInquiryPayload(inquiry);
    const dates = [payload.start_date || payload.check_in || payload.from, payload.end_date || payload.check_out || payload.to]
      .filter(Boolean)
      .join(' → ');
    return `
      <div class="stack-item">
        <div>
          <strong>${accountEscapeHtml(inquiry.offerTitle || payload.offer || payload.property_name || 'Property request')}</strong>
          <span>${accountEscapeHtml(inquiry.name || payload.name || 'Unnamed customer')} · ${accountEscapeHtml(getInquiryContact(inquiry, payload))}</span>
          ${dates ? `<span>Dates: ${accountEscapeHtml(dates)}</span>` : ''}
          ${payload.guests ? `<span>Guests: ${accountEscapeHtml(payload.guests)}</span>` : ''}
          ${payload.message || payload.notes ? `<span>Request: ${accountEscapeHtml(payload.message || payload.notes)}</span>` : ''}
        </div>
        <span class="status-pill ${inquiry.status === 'resolved' || inquiry.status === 'closed' ? 'status-approved' : 'status-pending'}">${accountEscapeHtml((inquiry.status || 'new').replaceAll('_', ' '))}</span>
      </div>
    `;
  }).join('');
};

const renderOwnerOfferForm = (offer = {}) => `
  <form class="account-inline-form" data-owner-offer-form data-offer-id="${accountEscapeHtml(offer.id || '')}">
    <label>Available from <input type="date" name="availableFrom" value="${accountEscapeHtml(offer.availableFrom || '')}" /></label>
    <label>Available to <input type="date" name="availableTo" value="${accountEscapeHtml(offer.availableTo || '')}" /></label>
    <label>Price label <input type="text" name="priceLabel" value="${accountEscapeHtml(offer.priceLabel || '')}" placeholder="From €650/night" /></label>
    <label>Discount <input type="text" name="discountLabel" value="${accountEscapeHtml(offer.discountLabel || '')}" placeholder="10% for 7+ nights" /></label>
    <label>Availability notes <textarea name="availabilityNotes" rows="3" placeholder="Peak dates, blocked dates, seasonal notes">${accountEscapeHtml(offer.availabilityNotes || '')}</textarea></label>
    <button class="btn btn-secondary" type="submit">Save availability, price, and discount</button>
  </form>
`;

const renderRoleOffers = (target, offers = [], emptyMessage = 'No assigned offers yet.', role = '') => {
  if (!target) return;
  if (!offers.length) {
    target.innerHTML = `<p class="empty-state">${accountEscapeHtml(emptyMessage)}</p>`;
    return;
  }

  target.innerHTML = offers.map((offer) => `
    <div class="stack-item stack-item-vertical">
      <div>
        <strong>${accountEscapeHtml(offer.title || 'Untitled offer')}</strong>
        <span>${accountEscapeHtml(offer.locationLabel || [offer.country, offer.region].filter(Boolean).join(' · '))} · ${accountEscapeHtml(offerStatusLabel(offer))}</span>
        <span>${accountEscapeHtml(dateRangeLabel(offer))}</span>
        ${offer.priceLabel ? `<span>Price: ${accountEscapeHtml(offer.priceLabel)}</span>` : ''}
        ${offer.discountLabel ? `<span>Discount: ${accountEscapeHtml(offer.discountLabel)}</span>` : ''}
        ${offer.availabilityNotes ? `<span>Availability note: ${accountEscapeHtml(offer.availabilityNotes)}</span>` : ''}
        ${offer.ownerEmail ? `<span>Owner: ${accountEscapeHtml(offer.ownerEmail)}</span>` : ''}
        ${offer.managerEmail ? `<span>Manager: ${accountEscapeHtml(offer.managerEmail)}</span>` : ''}
        ${offer.ownerNotes ? `<span>Owner note: ${accountEscapeHtml(offer.ownerNotes)}</span>` : ''}
        ${offer.managerNotes ? `<span>Manager note: ${accountEscapeHtml(offer.managerNotes)}</span>` : ''}
      </div>
      <span class="status-pill ${offer.status === 'published' ? 'status-approved' : 'status-pending'}">${accountEscapeHtml(offer.status || 'draft')}</span>
      ${role === 'owner' ? renderOwnerOfferForm(offer) : ''}
    </div>
  `).join('');
};

const fetchRoleCollection = async (endpoint, key) => {
  const response = await fetch(endpoint, { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Unable to load ${key}.`);
  return Array.isArray(data[key]) ? data[key] : [];
};

const loadRolePanelRequests = async (role) => {
  const endpoint = role === 'owner' ? '/api/owner/inquiries' : role === 'manager' ? '/api/manager/inquiries' : '';
  const target = role === 'owner' ? ownerRequestsTarget : role === 'manager' ? managerRequestsTarget : null;
  if (!endpoint || !target) return;

  try {
    const inquiries = await fetchRoleCollection(endpoint, 'inquiries');
    renderRoleRequests(target, inquiries, role === 'owner'
      ? 'No customer stay requests are connected to your properties yet.'
      : 'No customer stay requests are connected to your assigned properties yet.');
  } catch (error) {
    renderRoleRequests(target, [], error.message || 'Unable to load customer requests.');
  }
};

const loadRolePanelOffers = async (role) => {
  const endpoint = role === 'owner' ? '/api/owner/offers' : role === 'manager' ? '/api/manager/offers' : '';
  const target = role === 'owner' ? ownerOffersTarget : role === 'manager' ? managerOffersTarget : null;
  if (!endpoint || !target) return;

  try {
    const offers = await fetchRoleCollection(endpoint, 'offers');
    renderRoleOffers(target, offers, role === 'owner'
      ? 'No offers are assigned to your owner email yet.'
      : 'No offers are assigned to your manager email yet.', role);
  } catch (error) {
    renderRoleOffers(target, [], error.message || 'Unable to load assigned offers.', role);
  }

  await loadRolePanelRequests(role);
};

const renderAccountProfile = (profile, grant = null) => {
  if (!accountProfile) return;

  if (!profile) {
    accountProfile.innerHTML = '<p class="empty-state">No profile loaded yet. <a href="login.html">Login</a> first, or <a href="register.html">create your account</a> if you are new.</p>';
    return;
  }

  const currentRole = grant?.role || profile.defaultRole || profile.requestedRole || 'customer';
  const profileStatus = profile.status || (currentRole === 'customer' ? 'active' : 'pending_admin_grant');
  const companyDetails = [
    profile.companyName ? `Company: ${accountEscapeHtml(profile.companyName)}` : '',
    profile.businessContext ? `Context: ${accountEscapeHtml(profile.businessContext)}` : '',
    profile.companyWebsite ? `Website: <a href="${accountEscapeHtml(profile.companyWebsite)}" target="_blank" rel="noopener">${accountEscapeHtml(profile.companyWebsite)}</a>` : '',
  ].filter(Boolean).map((item) => `<span>${item}</span>`).join('');

  accountProfile.innerHTML = `
    <div class="stack-item">
      <div>
        <strong>${accountEscapeHtml(profile.name || 'Unnamed account')}</strong>
        <span>${accountEscapeHtml(profile.email)} · Requested: ${accountEscapeHtml(profile.requestedRole || 'customer')} · Current: ${accountEscapeHtml(currentRole)}</span>
        ${companyDetails}
      </div>
      <span class="status-pill ${accountStatusClass(profileStatus)}">${accountEscapeHtml(accountStatusLabel(profileStatus))}</span>
    </div>
  `;
};

const restoreCachedAccountSession = (cachedSession, status = 'Your verified browser session is active while we reconnect to your account.') => {
  if (!hasVerifiedAccountSession(cachedSession)) return false;

  const cachedEmail = cachedSession.identity?.email || cachedSession.profile?.email;
  accountIdentity = cachedSession.identity || (cachedEmail ? { email: cachedEmail } : null);
  setAccountStatus({
    heading: isAccountLocalPreview() ? 'Local preview session' : 'Email verified',
    status,
    email: cachedEmail,
    role: getAccountRole(cachedSession),
    approved: true,
  });
  renderAccountProfile(cachedSession.profile || loadAccountProfile(), cachedSession.grant);
  setLoginAccountState(true);
  if (redirectToRoleHomeIfNeeded(getAccountRole(cachedSession))) return true;
  return true;
};

const setAccountStatus = ({ heading, status, email, role, approved }) => {
  const canPrefillEmailInput = email && email.includes('@');
  const accountHref = getRoleHomePath(role);

  if (accountHeading) accountHeading.textContent = heading;
  if (accountStatus) accountStatus.textContent = status;
  if (accountEmail) accountEmail.textContent = email || 'Email pending';
  if (accountEmailInput && canPrefillEmailInput) {
    accountEmailInput.value = email;
    if (isRegisterPage()) accountEmailInput.readOnly = true;
  }
  if (accountRole) {
    accountRole.textContent = role;
    accountRole.classList.toggle('status-approved', Boolean(approved));
    accountRole.classList.toggle('status-warning', !approved);
    accountRole.classList.toggle('status-pending', false);
  }
  updateAccountNav({ email, role, active: Boolean(email && approved) });
  updateAccountAccessCards(String(role || '').toLowerCase());
  updateAccountLogout(Boolean(email && approved));
  if (email && approved) loadRolePanelOffers(getRequiredAccountRole() || normalizeAccountRole(role));
  if (isDashboardPage()) {
    if (email && approved) unlockDashboard();
    else lockDashboard();
  }

  if (loginAccountLink) loginAccountLink.href = accountHref;

  if (accountLoginLink) {
    if (isRegisterPage()) {
      accountLoginLink.textContent = 'Continue Registration';
      accountLoginLink.href = '#account-workspace';
    } else if (email && approved) {
      accountLoginLink.textContent = isDashboardPage() ? 'Refresh Account' : 'Open Account';
      accountLoginLink.href = isDashboardPage() ? getDashboardWorkspaceHash() : accountHref;
    } else {
      accountLoginLink.textContent = 'Continue with secure login';
      accountLoginLink.href = 'login.html';
    }
  }
};

const getAccountStatusCopy = (remoteAccount = {}, profile = null) => {
  if (!profile) {
    return isLoginPage()
      ? 'Your LuxeRoutes OTP session is active. Open your account to finish setup.'
      : 'Your email is verified. Create your profile to request customer, owner, or manager access.';
  }

  if (remoteAccount.accessStatus === 'pending_admin_grant' || remoteAccount.accessStatus === 'pending_review') {
    return 'Your profile is saved. Owner or manager dashboard access is pending LuxeRoutes review.';
  }

  return 'Your email is verified and your LuxeRoutes profile is ready.';
};

const applyRemoteAccount = (remoteAccount) => {
  accountIdentity = { email: remoteAccount.identityEmail, role: remoteAccount.role };
  const profile = remoteAccount.profile || null;
  saveAccountSession({ identity: accountIdentity, profile, grant: remoteAccount.grant, role: remoteAccount.role });
  setAccountStatus({
    heading: remoteAccount.accessStatus === 'pending_admin_grant' || remoteAccount.accessStatus === 'pending_review'
      ? 'Access pending review'
      : 'Email verified',
    status: getAccountStatusCopy(remoteAccount, profile),
    email: remoteAccount.identityEmail,
    role: remoteAccount.role || 'customer',
    approved: true,
  });
  renderAccountProfile(profile, remoteAccount.grant);
  setLoginAccountState(true);
  if (redirectToRoleHomeIfNeeded(remoteAccount.role || remoteAccount.grant?.role || profile?.defaultRole)) return true;
  return true;
};

const initialiseAccount = async () => {
  const cachedSession = loadAccountSession();
  const hasCachedSession = hasVerifiedAccountSession(cachedSession);
  const localPreview = isAccountLocalPreview();
  const loggedOut = new URLSearchParams(window.location.search).has('logged_out');
  setLoginAccountState(false);

  const remoteAccount = await loadRemoteAccountProfile();
  if (remoteAccount?.identityEmail) {
    applyRemoteAccount(remoteAccount);
    return;
  }

  const identity = await getAccessIdentity();
  if (identity) accountIdentity = identity;

  if (!localPreview && isProtectedAccountPage()) {
    redirectToLogin();
    return;
  }

  if (localPreview && hasCachedSession) {
    const restored = restoreCachedAccountSession(cachedSession, 'Your local preview session is active in this browser.');
    if (restored) return;
  }

  if (localPreview && isRegisterPage() && accountEmailInput) accountEmailInput.readOnly = false;
  setAccountStatus({
    heading: loggedOut ? 'Signed out' : 'Account access',
    status: loggedOut
      ? 'You have been signed out of LuxeRoutes on this browser. Use secure login when you are ready to return.'
      : (isLoginPage()
        ? 'Enter your email above and verify the Resend one-time code to open the correct LuxeRoutes dashboard for your role.'
        : 'A verified LuxeRoutes OTP session is required before private account details can be shown.'),
    email: 'Email pending',
    role: 'Account',
    approved: false,
  });
  renderAccountProfile(null);
};

accountForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(accountForm);
  const profile = {
    email: String(accountIdentity?.email || (isAccountLocalPreview() ? formData.get('email') : '') || '').trim().toLowerCase(),
    name: String(formData.get('name') || '').trim(),
    requestedRole: String(formData.get('requested_role') || 'customer'),
    companyName: String(formData.get('company_name') || '').trim(),
    companyWebsite: String(formData.get('company_website') || '').trim(),
    businessContext: String(formData.get('business_context') || '').trim(),
    notes: String(formData.get('notes') || '').trim(),
    status: String(formData.get('requested_role') || 'customer') === 'customer' ? 'active' : 'pending_admin_grant',
    updatedAt: new Date().toISOString(),
  };

  if ((!accountIdentity?.email && !isAccountLocalPreview()) || !profile.email || !profile.name) return;

  try {
    const remoteAccount = await saveRemoteAccountProfile(profile);
    const savedProfile = remoteAccount.profile || profile;
    saveAccountProfile(savedProfile);
    saveAccountSession({ identity: accountIdentity || { email: savedProfile.email }, profile: savedProfile, grant: remoteAccount.grant, role: remoteAccount.role });
    renderAccountProfile(savedProfile, remoteAccount.grant);
    setAccountStatus({
      heading: 'Profile saved',
      status: accountApiEnabled
        ? (savedProfile.requestedRole === 'customer'
          ? 'Your customer profile is active.'
          : 'Your profile is saved and waiting for owner or manager approval.')
        : 'Your profile is saved in this browser.',
      email: savedProfile.email,
      role: remoteAccount.role || 'Pending grant',
      approved: true,
    });
  } catch (error) {
    if (isAccountLocalPreview()) {
      saveAccountProfile(profile);
      saveAccountSession({ identity: accountIdentity || { email: profile.email }, profile, role: profile.defaultRole || profile.requestedRole || 'customer' });
      renderAccountProfile(profile);
    }
    setAccountStatus({
      heading: isAccountLocalPreview() ? 'Local fallback saved' : 'Profile not saved',
      status: isAccountLocalPreview() ? `${error.message} Your profile was saved in this browser only.` : error.message,
      email: profile.email,
      role: 'Profile notice',
      approved: false,
    });
  }
});



document.addEventListener('submit', async (event) => {
  const form = event.target.closest?.('[data-owner-offer-form]');
  if (!form) return;
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  if (button) button.disabled = true;
  try {
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    payload.id = form.dataset.offerId || '';
    const response = await fetch('/api/owner/offers', {
      method: 'PATCH',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Unable to save this offer.');
    await loadRolePanelOffers('owner');
  } catch (error) {
    window.alert(error.message || 'Unable to save this offer.');
  } finally {
    if (button) button.disabled = false;
  }
});

loginOtpBack?.addEventListener('click', () => {
  showLoginEmailStep();
  setLoginOtpMessage('Enter your email and we will send a fresh 6-digit login code.');
});

loginOtpForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = String(loginEmailInput?.value || '').trim().toLowerCase();
  const otp = String(loginCodeInput?.value || '').trim();
  const isCodeStep = Boolean(loginCodeStep && !loginCodeStep.hidden);

  if (!email || !email.includes('@')) {
    setLoginOtpMessage('Enter a valid email address.', 'error');
    return;
  }

  try {
    setLoginOtpBusy(true);
    if (!isCodeStep) {
      setLoginOtpMessage('Sending your secure login code…');
      const response = await requestLoginOtp(email);
      if (response?.adminAccess && response?.redirect) {
        setLoginOtpMessage('Opening Cloudflare Access for admin verification…', 'success');
        window.location.href = response.redirect;
        return;
      }
      showLoginCodeStep(email);
      setLoginOtpMessage('Check your email for the 6-digit LuxeRoutes code.', 'success');
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setLoginOtpMessage('Enter the 6-digit code from your email.', 'error');
      return;
    }

    setLoginOtpMessage('Verifying your code…');
    const remember = Boolean(loginRememberInput?.checked);
    const account = await verifyLoginOtp(email, otp, remember);
    const identity = account.identity || { email };
    const profile = account.profile || null;
    accountIdentity = identity;
    try {
      saveAccountSession({ identity, profile, grant: account.grant, role: account.role, remember });
    } catch (storageError) {
      // The server has already set the HttpOnly account cookie, so continue even
      // when a browser blocks sessionStorage/localStorage for this page.
    }
    setLoginOtpMessage('Signed in successfully. Opening your account…', 'success');
    window.location.assign(getLoginRedirectTarget(account));
  } catch (error) {
    setLoginOtpMessage(error.message || 'Unable to complete login right now.', 'error');
  } finally {
    setLoginOtpBusy(false);
  }
});

accountLogoutButtons.forEach((button) => button.addEventListener('click', logoutAccount));

updateAccountAccessCards();
updateAccountLogout(false);
initialiseAccount();
