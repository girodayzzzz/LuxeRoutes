const accountStatus = document.querySelector('[data-account-status]');
const accountHeading = document.querySelector('[data-account-heading]');
const accountEmail = document.querySelector('[data-account-email]');
const accountRole = document.querySelector('[data-account-role]');
const accountForm = document.querySelector('[data-account-form]');
const accountEmailInput = document.querySelector('[data-account-email-input]');
const accountProfile = document.querySelector('[data-account-profile]');
const accountLoginLink = document.querySelector('[data-account-login-link]');
const loginForm = document.querySelector('[data-login-form]');
const loginEmailStep = document.querySelector('[data-login-step="email"]');
const loginOtpStep = document.querySelector('[data-login-step="otp"]');
const loginOtpEmail = document.querySelector('[data-login-otp-email]');
const loginOtpInput = document.querySelector('[data-login-otp-input]');
const loginRememberInput = document.querySelector('[name="remember"]');
const loginBackButton = document.querySelector('[data-login-back]');
const loginHelper = document.querySelector('[data-login-helper]');
const loginAccountState = document.querySelector('[data-login-account-state]');
const loginSessionStatus = document.querySelector('[data-login-session-status]');
const loginBoxHead = document.querySelector('.login-box-head');
const loginSecurityList = document.querySelector('.login-security-list');
const accountSwitchLink = document.querySelector('.account-switch-link');
const accountLogoutButtons = document.querySelectorAll('[data-account-logout]');
const isRegisterPage = () => document.body.classList.contains('account-page') && Boolean(accountForm);
const isDashboardPage = () => document.body.classList.contains('account-dashboard-page');
const isLoginPage = () => document.body.classList.contains('login-page');

if (document.body.classList.contains('account-dashboard-page')) {
  document.body.classList.remove('admin-page');
}
const accountStorageKey = 'luxeroutes-account-profile-v1';
const accountSessionKey = 'luxeroutes-account-session-v1';
const accountSessionTtlMs = 4 * 60 * 60 * 1000;
const loginPreviewOtp = '246810';
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

const redirectToLogin = () => {
  if (!isDashboardPage()) return;
  lockDashboard();
  const target = `${window.location.pathname}${window.location.search}${window.location.hash}`;
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


const setLoginOtpStep = (email) => {
  if (!loginEmailStep || !loginOtpStep) return;

  loginEmailStep.hidden = true;
  loginOtpStep.hidden = false;
  loginEmailStep.classList.remove('is-active');
  loginOtpStep.classList.add('is-active');
  if (loginOtpEmail) loginOtpEmail.textContent = email;
  if (loginOtpInput) {
    loginOtpInput.required = true;
    loginOtpInput.focus({ preventScroll: true });
  }
  if (loginHelper) {
    loginHelper.textContent = isAccountLocalPreview()
      ? `Enter verification code ${loginPreviewOtp} to continue.`
      : 'Check your email for the one-time code, then enter it below to continue.';
  }
};

const requestEmailOtp = async (email) => {
  const response = await fetch('/api/auth/otp', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin',
    body: JSON.stringify({ email }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Verification email could not be sent.');
  return payload;
};

const verifyEmailOtp = async (email, otp) => {
  const response = await fetch('/api/auth/otp?action=verify', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin',
    body: JSON.stringify({ email, otp }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Verification code could not be confirmed.');
  return payload;
};

const resetLoginOtpStep = () => {
  if (!loginEmailStep || !loginOtpStep) return;

  loginEmailStep.hidden = false;
  loginOtpStep.hidden = true;
  loginEmailStep.classList.add('is-active');
  loginOtpStep.classList.remove('is-active');
  if (loginOtpInput) {
    loginOtpInput.required = false;
    loginOtpInput.value = '';
  }
  if (loginHelper) loginHelper.textContent = 'Enter your email to receive a one-time verification code.';
  accountEmailInput?.focus({ preventScroll: true });
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

const getLoginRedirectTarget = () => {
  const redirect = new URLSearchParams(window.location.search).get('redirect');
  if (!redirect) return 'account.html';

  try {
    const url = new URL(redirect, window.location.origin);
    if (url.origin !== window.location.origin) return 'account.html';
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

const logoutAccount = () => {
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

  [loginBoxHead, loginForm, loginSecurityList, loginSessionStatus, accountSwitchLink].forEach((element) => {
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

const setAccountStatus = ({ heading, status, email, role, approved }) => {
  const canPrefillEmailInput = email && email.includes('@');

  if (accountHeading) accountHeading.textContent = heading;
  if (accountStatus) accountStatus.textContent = status;
  if (accountEmail) accountEmail.textContent = email || 'Email pending';
  if (accountEmailInput && canPrefillEmailInput) accountEmailInput.value = email;
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
  setLoginAccountState(false);

  if (isDashboardPage() && !hasCachedSession && !isAccountLocalPreview()) {
    redirectToLogin();
    return;
  }

  if (hasCachedSession) {
    const cachedEmail = cachedSession.identity?.email || cachedSession.profile?.email;
    accountIdentity = cachedSession.identity || (cachedEmail ? { email: cachedEmail } : null);
    setAccountStatus({
      heading: 'Session restored',
      status: isLoginPage() ? 'You are signed in and can open your LuxeRoutes account.' : 'Your account session is active in this browser.',
      email: cachedEmail,
      role: getAccountRole(cachedSession),
      approved: true,
    });
    renderAccountProfile(cachedSession.profile || loadAccountProfile(), cachedSession.grant);
    setLoginAccountState(true);
  }

  const identity = await getAccessIdentity();
  if (identity) accountIdentity = identity;
  const remoteAccount = identity ? await loadRemoteAccountProfile() : null;
  const profile = remoteAccount?.profile || (hasCachedSession ? cachedSession?.profile : null) || null;

  if (identity) {
    saveAccountSession({ identity, profile, grant: remoteAccount?.grant, role: remoteAccount?.role });
    setAccountStatus({
      heading: 'Email verified',
      status: remoteAccount?.profile
        ? 'Your email is verified and your LuxeRoutes profile is ready.'
        : (isLoginPage()
          ? 'Your email is verified. Continue to Account for accepted offers, settings, and private updates.'
          : 'Your email is verified. Create your profile to request customer, owner, or manager access.'),
      email: identity.email,
      role: remoteAccount?.role ? accountEscapeHtml(remoteAccount.role) : 'customer',
      approved: true,
    });
    setLoginAccountState(true);
  } else if (hasCachedSession) {
    setAccountStatus({
      heading: isLoginPage() ? 'Account access' : 'Session still active',
      status: isLoginPage() ? 'Sign in with your email to open your LuxeRoutes account.' : 'Your account session is active in this browser.',
      email: cachedSession.identity?.email || cachedSession.profile?.email,
      role: getAccountRole(cachedSession),
      approved: true,
    });
    setLoginAccountState(true);
  } else if (isAccountLocalPreview()) {
    if (isDashboardPage()) {
      redirectToLogin();
      return;
    }

    setAccountStatus({
      heading: 'Account access',
      status: 'Sign in with your email to open your LuxeRoutes account.',
      email: 'Email pending',
      role: 'Account',
      approved: false,
    });
    setLoginAccountState(false);
  } else {
    if (isDashboardPage()) {
      redirectToLogin();
      return;
    }

    setAccountStatus({
      heading: 'Account access',
      status: 'Sign in with your email to open your LuxeRoutes account.',
      email: 'Email pending',
      role: 'Account',
      approved: false,
    });
    setLoginAccountState(false);
  }

  renderAccountProfile(profile, remoteAccount?.grant || cachedSession?.grant);
};

accountForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(accountForm);
  const profile = {
    email: String(accountIdentity?.email || formData.get('email') || '').trim().toLowerCase(),
    name: String(formData.get('name') || '').trim(),
    requestedRole: String(formData.get('requested_role') || 'customer'),
    companyName: String(formData.get('company_name') || '').trim(),
    companyWebsite: String(formData.get('company_website') || '').trim(),
    businessContext: String(formData.get('business_context') || '').trim(),
    notes: String(formData.get('notes') || '').trim(),
    status: String(formData.get('requested_role') || 'customer') === 'customer' ? 'active' : 'pending_admin_grant',
    updatedAt: new Date().toISOString(),
  };

  if (!profile.email || !profile.name) return;

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
    saveAccountProfile(profile);
    saveAccountSession({ identity: accountIdentity || { email: profile.email }, profile, role: profile.defaultRole || profile.requestedRole || 'customer' });
    renderAccountProfile(profile);
    setAccountStatus({
      heading: 'Local fallback saved',
      status: `${error.message} Your profile was saved in this browser only.`,
      email: profile.email,
      role: 'Profile notice',
      approved: false,
    });
  }
});

accountLogoutButtons.forEach((button) => button.addEventListener('click', logoutAccount));

loginBackButton?.addEventListener('click', resetLoginOtpStep);

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const email = String(formData.get('email') || accountIdentity?.email || '').trim().toLowerCase();
  const otp = String(formData.get('otp') || '').trim();
  const otpStepActive = Boolean(loginOtpStep && !loginOtpStep.hidden);

  if (!email) return;

  if (!otpStepActive) {
    const submitButton = loginForm.querySelector('[data-login-email-submit]');
    if (submitButton) submitButton.disabled = true;

    try {
      if (!isAccountLocalPreview()) await requestEmailOtp(email);
      setLoginOtpStep(email);
      setAccountStatus({
        heading: 'Verification code sent',
        status: isAccountLocalPreview()
          ? `Enter verification code ${loginPreviewOtp} to continue.`
          : 'We sent a 6-digit verification code to your email. Enter it below to continue.',
        email,
        role: 'Email verification',
        approved: false,
      });
    } catch (error) {
      setAccountStatus({
        heading: 'Verification code was not sent',
        status: error.message,
        email,
        role: 'Verification error',
        approved: false,
      });
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
    return;
  }

  if (!/^\d{6}$/.test(otp)) {
    setAccountStatus({
      heading: 'Enter verification code',
      status: 'Verification code must contain 6 digits.',
      email,
      role: 'Code required',
      approved: false,
    });
    loginOtpInput?.focus({ preventScroll: true });
    return;
  }

  if (isAccountLocalPreview() && otp !== loginPreviewOtp) {
    setAccountStatus({
      heading: 'Incorrect verification code',
      status: `Use verification code ${loginPreviewOtp} to continue.`,
      email,
      role: 'Verification error',
      approved: false,
    });
    loginOtpInput?.focus({ preventScroll: true });
    return;
  }

  const submitButton = loginForm.querySelector('[data-login-otp-submit]');
  if (submitButton) submitButton.disabled = true;

  try {
    const remoteAccount = isAccountLocalPreview() ? null : await verifyEmailOtp(email, otp);
    const storedProfile = loadAccountProfile();
    const verifiedProfile = remoteAccount?.profile || (storedProfile?.email === email
      ? storedProfile
      : { email, name: 'LuxeRoutes guest', defaultRole: 'customer', status: 'active' });

    saveAccountSession({
      identity: remoteAccount?.identity || accountIdentity || { email },
      profile: verifiedProfile,
      grant: remoteAccount?.grant,
      role: remoteAccount?.role || 'customer',
      remember: Boolean(loginRememberInput?.checked),
    });

    setAccountStatus({
      heading: 'Verification complete',
      status: isAccountLocalPreview()
        ? 'Verified session saved. Opening the account dashboard.'
        : 'Verification complete. Opening the account dashboard.',
      email,
      role: isAccountLocalPreview() ? 'Preview verification' : (remoteAccount?.role || 'Email verification'),
      approved: true,
    });

    window.location.href = getLoginRedirectTarget();
  } catch (error) {
    setAccountStatus({
      heading: 'Verification incomplete',
      status: error.message,
      email,
      role: 'Verification error',
      approved: false,
    });
    loginOtpInput?.focus({ preventScroll: true });
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});

updateAccountAccessCards();
updateAccountLogout(false);
initialiseAccount();
