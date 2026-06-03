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
const loginBackButton = document.querySelector('[data-login-back]');
const loginHelper = document.querySelector('[data-login-helper]');
const isRegisterPage = () => document.body.classList.contains('account-page') && Boolean(accountForm);
const isDashboardPage = () => document.body.classList.contains('account-dashboard-page');
const isLoginPage = () => document.body.classList.contains('login-page');
const accountStorageKey = 'luxeroutes-account-profile-v1';
const accountSessionKey = 'luxeroutes-account-session-v1';
const accountSessionTtlMs = 4 * 60 * 60 * 1000;
const loginPreviewOtp = '246810';
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

const loadAccountSession = () => {
  const stored = sessionStorage.getItem(accountSessionKey);
  if (!stored) return null;

  try {
    const session = JSON.parse(stored);
    if (isSessionFresh(session)) return session;
  } catch (error) {
    // Ignore invalid browser cache and start a clean session.
  }

  sessionStorage.removeItem(accountSessionKey);
  return null;
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
      ? `Local preview: use test OTP code ${loginPreviewOtp}.`
      : 'Check your email for the one-time code. If the page is protected by Cloudflare Access, the same email is verified there too.';
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
  if (!response.ok) throw new Error(payload.error || 'OTP email could not be sent.');
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
  if (!response.ok) throw new Error(payload.error || 'OTP code could not be verified.');
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
  if (loginHelper) loginHelper.textContent = 'In production, the email API sends the OTP; local preview shows a test code.';
  accountEmailInput?.focus({ preventScroll: true });
};

const saveAccountSession = ({ identity = accountIdentity, profile = null, grant = null, role = null } = {}) => {
  if (!identity?.email && !profile?.email) return;

  sessionStorage.setItem(accountSessionKey, JSON.stringify({
    identity,
    profile,
    grant,
    role: role || grant?.role || profile?.defaultRole || 'customer',
    savedAt: Date.now(),
    expiresAt: Date.now() + accountSessionTtlMs,
  }));
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
    throw new Error(message.error || 'Unable to save profile in D1.');
  }

  accountApiEnabled = true;
  return response.json();
};

const updateAccountNav = ({ email = '', role = '', active = false } = {}) => {
  document.querySelectorAll('[data-nav-login]').forEach((link) => {
    link.textContent = active ? 'Logged in' : 'Login';
    link.setAttribute('aria-label', active
      ? `Email session active for ${email || role || 'signed-in user'}`
      : 'Login to LuxeRoutes');
  });

  document.querySelectorAll('[data-nav-account]').forEach((link) => {
    link.textContent = active ? 'My Account' : 'Account';
    link.setAttribute('aria-label', active
      ? `Open LuxeRoutes account for ${email || role || 'signed-in user'}`
      : 'Open LuxeRoutes account dashboard');
  });
};

const renderAccountProfile = (profile, grant = null) => {
  if (!accountProfile) return;

  if (!profile) {
    accountProfile.innerHTML = '<p class="empty-state">No profile loaded yet. <a href="login.html">Login</a> first, or <a href="register.html">create your account</a> if you are new.</p>';
    return;
  }

  const currentRole = grant?.role || profile.defaultRole || 'customer';
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
  if (accountHeading) accountHeading.textContent = heading;
  if (accountStatus) accountStatus.textContent = status;
  if (accountEmail) accountEmail.textContent = email || 'Email pending';
  if (accountEmailInput && email) accountEmailInput.value = email;
  if (accountRole) {
    accountRole.textContent = role;
    accountRole.classList.toggle('status-approved', Boolean(approved));
    accountRole.classList.toggle('status-warning', !approved);
    accountRole.classList.toggle('status-pending', false);
  }
  updateAccountNav({ email, role, active: Boolean(email && approved) });

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

  if (cachedSession?.profile || cachedSession?.identity) {
    const cachedEmail = cachedSession.identity?.email || cachedSession.profile?.email;
    accountIdentity = cachedSession.identity || (cachedEmail ? { email: cachedEmail } : null);
    setAccountStatus({
      heading: 'Session restored',
      status: 'Your login view is kept for this browser tab for a few hours. Cloudflare Access still verifies protected account actions in the background.',
      email: cachedEmail,
      role: cachedSession.role || cachedSession.grant?.role || cachedSession.profile?.defaultRole || 'Customer login',
      approved: true,
    });
    renderAccountProfile(cachedSession.profile || loadAccountProfile(), cachedSession.grant);
  }

  const identity = await getAccessIdentity();
  accountIdentity = identity;
  const remoteAccount = identity ? await loadRemoteAccountProfile() : null;
  const profile = remoteAccount?.profile || cachedSession?.profile || loadAccountProfile();

  if (identity) {
    saveAccountSession({ identity, profile, grant: remoteAccount?.grant, role: remoteAccount?.role });
    setAccountStatus({
      heading: 'Email verified',
      status: remoteAccount?.profile
        ? 'Cloudflare Access verified your email and loaded your profile from Cloudflare D1.'
        : (isLoginPage()
          ? 'Cloudflare Access verified your email. Continue to Account for accepted offers, settings, and coupons, or register if you still need a profile.'
          : 'Cloudflare Access verified your email. Register as a customer, then an admin can grant owner or manager access by this email.'),
      email: identity.email,
      role: remoteAccount?.role ? accountEscapeHtml(remoteAccount.role) : 'Customer login',
      approved: true,
    });
  } else if (cachedSession?.profile || cachedSession?.identity) {
    setAccountStatus({
      heading: 'Session still active',
      status: 'We kept your login session visible in this tab. Reopen Login if Cloudflare asks you to verify again.',
      email: cachedSession.identity?.email || cachedSession.profile?.email,
      role: cachedSession.role || 'Cached account',
      approved: true,
    });
  } else if (isAccountLocalPreview()) {
    setAccountStatus({
      heading: 'Local preview',
      status: 'Local preview is active. In production, protect login/register/account with Cloudflare Access so visitors verify by email.',
      email: profile?.email || 'localhost preview',
      role: 'Preview',
      approved: true,
    });
  } else {
    setAccountStatus({
      heading: 'Login required',
      status: 'Use the Login page to verify by email before opening Account. New users should create a profile on Register first.',
      email: 'Cloudflare Access required',
      role: 'Not verified',
      approved: false,
    });
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
          ? 'Your customer profile is active in Cloudflare D1.'
          : 'Your profile is saved in Cloudflare D1 and is waiting for admin approval before owner or manager access is enabled.')
        : 'Your profile is saved locally.',
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
      status: `${error.message} The profile was saved in this browser only; check the D1 binding before production.`,
      email: profile.email,
      role: 'D1 warning',
      approved: false,
    });
  }
});

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
        heading: 'OTP code sent',
        status: isAccountLocalPreview()
          ? `For local preview, enter test code ${loginPreviewOtp}.`
          : 'We sent a 6-digit OTP code to your email. Enter it below to continue without a password.',
        email,
        role: 'Email OTP',
        approved: true,
      });
    } catch (error) {
      setAccountStatus({
        heading: 'OTP was not sent',
        status: error.message,
        email,
        role: 'OTP error',
        approved: false,
      });
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
    return;
  }

  if (!/^\d{6}$/.test(otp)) {
    setAccountStatus({
      heading: 'Enter OTP code',
      status: 'OTP code must contain 6 digits.',
      email,
      role: 'OTP required',
      approved: false,
    });
    loginOtpInput?.focus({ preventScroll: true });
    return;
  }

  if (isAccountLocalPreview() && otp !== loginPreviewOtp) {
    setAccountStatus({
      heading: 'Incorrect test code',
      status: `For local preview, use OTP code ${loginPreviewOtp}.`,
      email,
      role: 'OTP error',
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
    });

    setAccountStatus({
      heading: 'OTP verified',
      status: isAccountLocalPreview()
        ? 'Local OTP session saved. Opening the account dashboard.'
        : 'OTP is verified. Opening the account dashboard.',
      email,
      role: isAccountLocalPreview() ? 'Preview OTP' : (remoteAccount?.role || 'Email OTP'),
      approved: true,
    });

    window.location.href = 'account.html';
  } catch (error) {
    setAccountStatus({
      heading: 'OTP not verified',
      status: error.message,
      email,
      role: 'OTP error',
      approved: false,
    });
    loginOtpInput?.focus({ preventScroll: true });
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});

initialiseAccount();
