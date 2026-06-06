const accountStatus = document.querySelector('[data-account-status]');
const accountHeading = document.querySelector('[data-account-heading]');
const accountEmail = document.querySelector('[data-account-email]');
const accountRole = document.querySelector('[data-account-role]');
const accountForm = document.querySelector('[data-account-form]');
const accountEmailInput = document.querySelector('[data-account-email-input]');
const accountProfile = document.querySelector('[data-account-profile]');
const accountLoginLink = document.querySelector('[data-account-login-link]');
const loginAccountState = document.querySelector('[data-login-account-state]');
const loginActions = document.querySelector('[data-login-actions]');
const loginSessionStatus = document.querySelector('[data-login-session-status]');
const loginBoxHead = document.querySelector('.login-box-head');
const loginSecurityList = document.querySelector('.login-security-list');
const accountSwitchLink = document.querySelector('.account-switch-link');
const accountLogoutButtons = document.querySelectorAll('[data-account-logout]');
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
const isProtectedAccountPage = () => isDashboardPage() || isRegisterPage();
const isLoginPage = () => document.body.classList.contains('login-page');

if (document.body.classList.contains('account-dashboard-page')) {
  document.body.classList.remove('admin-page');
}
const accountStorageKey = 'luxeroutes-account-profile-v1';
const accountSessionKey = 'luxeroutes-account-session-v1';
const accountSessionTtlMs = 4 * 60 * 60 * 1000;
const accountDashboardRoles = ['customer', 'owner', 'manager', 'admin', 'partner'];
let accountIdentity = null;
let accountApiEnabled = false;

const accountEscapeHtml = (value) => String(value || '').replace(/[&<>"]/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
}[character]));

const isAccountLocalPreview = () => ['localhost', '127.0.0.1', ''].includes(window.location.hostname);

const isSessionFresh = (session) => Boolean(session?.expiresAt && Date.now() < session.expiresAt);

const normalizeAccountRole = (role) => (accountDashboardRoles.includes(role) ? role : 'customer');

const hasVerifiedAccountSession = (session) => Boolean(isSessionFresh(session) && (session?.identity?.email || session?.profile?.email));

const lockDashboard = () => {
  if (isDashboardPage()) document.body.dataset.accountLocked = 'true';
};

const unlockDashboard = () => {
  if (isDashboardPage()) document.body.dataset.accountLocked = 'false';
};

const getCurrentAccountTarget = () => `${window.location.pathname}${window.location.search}${window.location.hash}`;

const isLoginRedirectTarget = (path) => ['/login', '/login.html'].includes(path.replace(/\/$/, ''));

const redirectToLogin = () => {
  if (!isProtectedAccountPage()) return;
  lockDashboard();
  const target = getCurrentAccountTarget();
  window.location.replace(`login.html?redirect=${encodeURIComponent(target)}`);
};

const clearAccountSession = () => {
  sessionStorage.removeItem(accountSessionKey);
  localStorage.removeItem(accountSessionKey);
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
  const sessionSession = parseStoredAccountSession(sessionStorage.getItem(accountSessionKey));
  const rememberedSession = parseStoredAccountSession(localStorage.getItem(accountSessionKey));
  const session = sessionSession || rememberedSession;

  if (!session) clearAccountSession();
  return session;
};


const saveAccountSession = ({ identity = accountIdentity, profile = null, grant = null, role = null, remember = false } = {}) => {
  if (!identity?.email && !profile?.email) return;

  const shouldRemember = remember || Boolean(parseStoredAccountSession(localStorage.getItem(accountSessionKey)));
  const serializedSession = JSON.stringify({
    identity,
    profile,
    grant,
    role: normalizeAccountRole(role || grant?.role || profile?.defaultRole || profile?.requestedRole),
    remembered: shouldRemember,
    savedAt: Date.now(),
    expiresAt: Date.now() + accountSessionTtlMs,
  });

  sessionStorage.setItem(accountSessionKey, serializedSession);
  if (shouldRemember) localStorage.setItem(accountSessionKey, serializedSession);
  else localStorage.removeItem(accountSessionKey);
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
    const response = await fetch('/.cloudflare/access/get-identity', {
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
  const stored = localStorage.getItem(accountStorageKey);
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch (error) {
    return null;
  }
};

const saveAccountProfile = (profile) => {
  localStorage.setItem(accountStorageKey, JSON.stringify(profile));
};

const loadRemoteAccountProfile = async () => {
  try {
    const response = await fetch('/api/account', {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
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
  const response = await fetch('/api/account', {
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
  if (loginEmailStep) loginEmailStep.hidden = true;
  if (loginCodeStep) loginCodeStep.hidden = false;
  if (loginOtpEmail) loginOtpEmail.textContent = email;
  loginCodeInput?.focus();
};

const showLoginEmailStep = () => {
  if (loginEmailStep) loginEmailStep.hidden = false;
  if (loginCodeStep) loginCodeStep.hidden = true;
  loginEmailInput?.focus();
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

const verifyLoginOtp = async (email, otp) => {
  const response = await fetch('/api/auth/otp?action=verify', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ email, otp }),
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

const getLoginRedirectTarget = () => {
  const redirect = new URLSearchParams(window.location.search).get('redirect');
  if (!redirect) return 'account.html';

  try {
    const url = new URL(redirect, window.location.origin);
    if (url.origin !== window.location.origin || isLoginRedirectTarget(url.pathname)) return 'account.html';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch (error) {
    return 'account.html';
  }
};

const getAccountRole = (sessionOrAccount = {}) => normalizeAccountRole(sessionOrAccount?.role
  || sessionOrAccount?.grant?.role
  || sessionOrAccount?.profile?.defaultRole
  || sessionOrAccount?.profile?.requestedRole);

const updateAccountAccessCards = (role = 'customer') => {
  const normalizedRole = normalizeAccountRole(role);

  document.querySelectorAll('[data-account-role-link]').forEach((card) => {
    card.hidden = card.dataset.accountRoleLink !== normalizedRole;
  });

  document.querySelectorAll('[data-account-role-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.accountRolePanel !== normalizedRole;
  });
};

const updateAccountLogout = (active = false) => {
  accountLogoutButtons.forEach((button) => {
    button.hidden = !active;
  });
};

const logoutAccount = async () => {
  await logoutRemoteAccountSession();
  clearAccountSession();
  accountIdentity = null;
  updateAccountAccessCards();
  updateAccountLogout(false);
  window.location.href = 'login.html';
};

const updateAccountNav = ({ email = '', role = '', active = false } = {}) => {
  document.querySelectorAll('[data-nav-login]').forEach((link) => {
    link.hidden = active;
    link.textContent = 'Login';
    link.href = 'login.html';
    link.setAttribute('aria-label', 'Login to LuxeRoutes');
  });

  document.querySelectorAll('[data-nav-account]').forEach((link) => {
    link.hidden = !active;
    link.textContent = 'Account';
    link.href = 'account.html';
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
  if (loginAccountState) loginAccountState.hidden = !active;
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
  return true;
};

const setAccountStatus = ({ heading, status, email, role, approved }) => {
  const canPrefillEmailInput = email && email.includes('@');

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
  if (isDashboardPage()) {
    if (email && approved) unlockDashboard();
    else lockDashboard();
  }

  if (accountLoginLink) {
    if (isRegisterPage()) {
      accountLoginLink.textContent = 'Continue Registration';
      accountLoginLink.href = '#account-workspace';
    } else if (email && approved) {
      accountLoginLink.textContent = isDashboardPage() ? 'Refresh Account' : 'Open Account';
      accountLoginLink.href = isDashboardPage() ? '#account-workspace' : 'account.html';
    } else {
      accountLoginLink.textContent = 'Login with Email';
      accountLoginLink.href = 'login.html';
    }
  }
};

const initialiseAccount = async () => {
  const cachedSession = loadAccountSession();
  const hasCachedSession = hasVerifiedAccountSession(cachedSession);
  const localPreview = isAccountLocalPreview();
  setLoginAccountState(false);

  // Cloudflare Access may have just established a session before this page loaded.
  // Always wait for its identity response before redirecting a protected page.
  const identity = await getAccessIdentity();
  if (identity) accountIdentity = identity;

  if (identity) {
    const remoteAccount = await loadRemoteAccountProfile();
    const profile = remoteAccount?.profile || null;
    saveAccountSession({ identity, profile, grant: remoteAccount?.grant, role: remoteAccount?.role });
    setAccountStatus({
      heading: 'Email verified',
      status: profile
        ? 'Your email is verified and your LuxeRoutes profile is ready.'
        : (isLoginPage()
          ? 'Your secure email session is active. Your private account is ready to open.'
          : 'Your email is verified. Create your profile to request customer, owner, or manager access.'),
      email: identity.email,
      role: remoteAccount?.role ? accountEscapeHtml(remoteAccount.role) : 'customer',
      approved: true,
    });
    renderAccountProfile(profile, remoteAccount?.grant);
    setLoginAccountState(true);
    return;
  }

  if (!identity && !localPreview) {
    const remoteAccount = await loadRemoteAccountProfile();
    if (remoteAccount?.identityEmail) {
      accountIdentity = { email: remoteAccount.identityEmail };
      const profile = remoteAccount.profile || null;
      saveAccountSession({ identity: accountIdentity, profile, grant: remoteAccount.grant, role: remoteAccount.role });
      setAccountStatus({
        heading: 'Email verified',
        status: profile
          ? 'Your email is verified and your LuxeRoutes profile is ready.'
          : (isLoginPage()
            ? 'Your secure email session is active. Your private account is ready to open.'
            : 'Your email is verified. Create your profile to request customer, owner, or manager access.'),
        email: remoteAccount.identityEmail,
        role: remoteAccount.role ? accountEscapeHtml(remoteAccount.role) : 'customer',
        approved: true,
      });
      renderAccountProfile(profile, remoteAccount.grant);
      setLoginAccountState(true);
      return;
    }
  }

  if (!localPreview && hasCachedSession) {
    const restored = restoreCachedAccountSession(
      cachedSession,
      'Your verified browser session is active while we reconnect to your account. Refresh if your latest profile details do not appear.',
    );
    if (restored) return;
  }

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
    heading: 'Account access',
    status: isLoginPage()
      ? 'Enter your email above and verify the one-time code to continue.'
      : 'A verified LuxeRoutes email session is required.',
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
    if (!isCodeStep) {
      setLoginOtpMessage('Sending your secure login code…');
      await requestLoginOtp(email);
      showLoginCodeStep(email);
      setLoginOtpMessage('Check your email for the 6-digit LuxeRoutes code.', 'success');
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setLoginOtpMessage('Enter the 6-digit code from your email.', 'error');
      return;
    }

    setLoginOtpMessage('Verifying your code…');
    const account = await verifyLoginOtp(email, otp);
    const identity = account.identity || { email };
    const profile = account.profile || null;
    accountIdentity = identity;
    saveAccountSession({ identity, profile, grant: account.grant, role: account.role, remember: Boolean(loginRememberInput?.checked) });
    setLoginOtpMessage('Signed in successfully. Opening your account…', 'success');
    window.location.href = getLoginRedirectTarget();
  } catch (error) {
    setLoginOtpMessage(error.message || 'Unable to complete login right now.', 'error');
  }
});

accountLogoutButtons.forEach((button) => button.addEventListener('click', logoutAccount));

updateAccountAccessCards();
updateAccountLogout(false);
initialiseAccount();
