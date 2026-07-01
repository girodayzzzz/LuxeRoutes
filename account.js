const accountStatus = document.querySelector('[data-account-status]');
const accountHeading = document.querySelector('[data-account-heading]');
const accountEmail = document.querySelector('[data-account-email]');
const accountRole = document.querySelector('[data-account-role]');
const accountForm = document.querySelector('[data-account-form]');
const accountEmailInput = document.querySelector('[data-account-email-input]');
const accountSubmit = document.querySelector('[data-account-submit]');
const registerProgress = document.querySelector('[data-register-progress]');
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
const accountSettingsForm = document.querySelector('[data-account-settings-form]');
const accountSettingsSubmit = document.querySelector('[data-account-settings-submit]');
const accountSettingsMessage = document.querySelector('[data-account-settings-message]');
const accountContactSummary = document.querySelector('[data-account-contact-summary]');
const currentEmailDisplay = document.querySelector('[data-current-email-display]');
const settingsNameInput = document.querySelector('[data-settings-name]');
const settingsCompanyInput = document.querySelector('[data-settings-company]');
const settingsNotesInput = document.querySelector('[data-settings-notes]');
const settingsPhoneInput = document.querySelector('[data-settings-phone]');
const settingsPreferredContactInput = document.querySelector('[data-settings-preferred-contact]');
const accountPasswordForm = document.querySelector('[data-account-password-form]');
const accountPasswordSubmit = document.querySelector('[data-account-password-submit]');
const accountPasswordMessage = document.querySelector('[data-account-password-message]');
const accountNewPasswordInput = document.querySelector('[data-new-password]');
const accountNewPasswordConfirmInput = document.querySelector('[data-new-password-confirm]');
const accountPasswordStrength = document.querySelector('[data-account-password-strength]');
const affiliateHeading = document.querySelector('[data-affiliate-heading]');
const affiliateMessage = document.querySelector('[data-affiliate-message]');
const affiliateStatus = document.querySelector('[data-affiliate-status]');
const affiliateVisits = document.querySelector('[data-affiliate-visits]');
const affiliateInquiries = document.querySelector('[data-affiliate-inquiries]');
const affiliateTotal = document.querySelector('[data-affiliate-total]');
const affiliateLinkForm = document.querySelector('[data-affiliate-link-form]');
const affiliateStatusCard = document.querySelector('[data-affiliate-status-card]');
const affiliateCodeOutput = document.querySelector('[data-affiliate-code]');
const affiliateNextStep = document.querySelector('[data-affiliate-next-step]');
const affiliateLinkCard = document.querySelector('[data-affiliate-link-card]');
const affiliateLinkStatus = document.querySelector('[data-affiliate-link-status]');
const affiliateLinkSubmit = document.querySelector('[data-affiliate-link-submit]');
const affiliateTargetPreset = document.querySelector('[data-affiliate-target-preset]');
const affiliateTargetInput = document.querySelector('[data-affiliate-target]');
const affiliateCopyLink = document.querySelector('[data-affiliate-copy-link]');
const affiliateLinkOutput = document.querySelector('[data-affiliate-link-output]');
const affiliateActivity = document.querySelector('[data-affiliate-activity]');
const ownerOffersTarget = document.querySelector('[data-owner-offers]');
const managerOffersTarget = document.querySelector('[data-manager-offers]');
const ownerRequestsTarget = document.querySelector('[data-owner-requests]');
const managerRequestsTarget = document.querySelector('[data-manager-requests]');
const ownerNewOfferForm = document.querySelector('[data-owner-new-offer-form]');
const ownerNewOfferStatus = document.querySelector('[data-owner-new-offer-status]');
const ownerListingChecklist = document.querySelector('[data-owner-listing-checklist]');
const ownerListingPreview = document.querySelector('[data-owner-listing-preview]');
const managerRequestFilter = document.querySelector('[data-manager-request-filter]');
const managerRequestCounts = document.querySelector('[data-manager-request-counts]');
const loginOtpForm = document.querySelector('[data-login-otp-form]');
const loginEmailStep = document.querySelector('[data-login-email-step]');
const loginCodeStep = document.querySelector('[data-login-code-step]');
const loginEmailInput = document.querySelector('[data-login-email-input]');
const loginCodeInput = document.querySelector('[data-login-code-input]');
const loginRememberInput = document.querySelector('[data-login-remember-input]');
const loginPasswordInput = document.querySelector('[data-login-password-input]');
const loginPasswordError = document.querySelector('[data-login-password-error]');
const passwordResetForm = document.querySelector('[data-password-reset-form]');
const forgotPasswordToggle = document.querySelector('[data-forgot-password-toggle]');
const forgotPasswordLink = document.querySelector('[data-forgot-password-link]');
const resetCancel = document.querySelector('[data-reset-cancel]');
const resetEmailInput = document.querySelector('[data-reset-email-input]');
const resetCodeInput = document.querySelector('[data-reset-code-input]');
const resetPasswordInput = document.querySelector('[data-reset-password-input]');
const resetPasswordConfirmInput = document.querySelector('[data-reset-password-confirm-input]');
const resetPasswordStrength = document.querySelector('[data-reset-password-strength]');
const resetSubmit = document.querySelector('[data-reset-submit]');
const resetMessage = document.querySelector('[data-reset-message]');
const registerOtpCodeInput = document.querySelector('[data-register-otp-code-input]');
const registerOtpCodeWrap = document.querySelector('[data-register-otp-code-wrap]');
const registerOtpMessage = document.querySelector('[data-register-otp-message]');
const registerComplete = document.querySelector('[data-register-complete]');
const registerCompleteHeading = document.querySelector('[data-register-complete-heading]');
const registerCompleteMessage = document.querySelector('[data-register-complete-message]');
const registerCompleteLink = document.querySelector('[data-register-complete-link]');
const loginOtpEmail = document.querySelector('[data-login-otp-email]');
const loginOtpMessage = document.querySelector('[data-login-otp-message]');
const loginOtpBack = document.querySelector('[data-login-otp-back]');
const loginResendCode = document.querySelector('[data-login-resend-code]');
const loginMagicLink = document.querySelector('[data-login-magic-link]');
const registerPasswordInput = document.querySelector('[data-register-password-input]');
const registerPasswordConfirm = document.querySelector('[data-register-password-confirm]');
const passwordStrength = document.querySelector('[data-password-strength]');
const accountEmailForm = document.querySelector('[data-account-email-form]');
const changeEmailInput = document.querySelector('[data-change-email-input]');
const changeEmailCode = document.querySelector('[data-change-email-code]');
const changeEmailSubmit = document.querySelector('[data-change-email-submit]');
const changeEmailMessage = document.querySelector('[data-change-email-message]');
const securityActivity = document.querySelector('[data-security-activity]');
const accountSavedOffers = document.querySelector('[data-account-saved-offers]');
const accountCoupons = document.querySelector('[data-account-coupons]');
const accountCustomerOffers = document.querySelector('[data-account-customer-offers]');
const isRegisterPage = () => document.body.classList.contains('register-page') && Boolean(accountForm);
const isDashboardPage = () => document.body.classList.contains('account-dashboard-page');
const isProtectedAccountPage = () => isDashboardPage();
const isLoginPage = () => document.body.classList.contains('login-page');
const isPasswordResetPage = () => document.body.classList.contains('reset-password-page');
const isAffiliatePage = () => document.body.classList.contains('affiliate-dashboard-page');

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
  partner: 'affiliate-panel.html',
};
let accountIdentity = null;
let accountApiEnabled = false;
const roleRequestCache = { owner: [], manager: [] };

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

const normalizeAccountRole = (role) => {
  const normalizedRole = String(role || '').trim().toLowerCase();
  return accountDashboardRoles.includes(normalizedRole) ? normalizedRole : 'customer';
};

const getRoleHomePath = (role) => accountRoleHomePaths[normalizeAccountRole(role)] || accountRoleHomePaths.customer;

const getRequiredAccountRole = () => document.body.dataset.requiredAccountRole || '';


const getAccountRoleLabel = (role) => ({
  owner: 'Owner',
  manager: 'Manager',
  admin: 'Admin',
  customer: 'Customer',
  partner: 'Partner',
}[normalizeAccountRole(role)] || 'Customer');


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

const fetchRemoteAccountProfile = async (endpoint) => {
  const response = await fetchAccountAuth(endpoint, {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
    redirect: 'manual',
  });

  if (!response.ok) return null;
  return response.json();
};

const loadRemoteAccountProfile = async () => {
  try {
    const data = await fetchRemoteAccountProfile('/api/account')
      || await fetchRemoteAccountProfile('/api/auth/otp?action=session');
    if (!data) return null;

    accountApiEnabled = true;
    return data;
  } catch (error) {
    return null;
  }
};

const setInlineMessage = (target, message = '', tone = 'pending') => {
  if (!target) return;
  target.textContent = message;
  target.classList.toggle('status-approved', tone === 'success');
  target.classList.toggle('status-warning', tone === 'error');
  target.classList.toggle('status-pending', tone !== 'success' && tone !== 'error');
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

const changeAccountPassword = async (currentPassword, newPassword, newPasswordConfirm) => {
  const response = await fetch('/api/auth/otp?action=change-password', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    redirect: 'manual',
    body: JSON.stringify({ currentPassword, newPassword, newPasswordConfirm }),
  });
  return readJsonOrAuthError(response, 'Unable to update your password right now.');
};

const contactPreferenceLabel = (value = '') => ({
  email: 'Email',
  whatsapp: 'WhatsApp',
  phone: 'Phone',
}[String(value || '').toLowerCase()] || 'Email');

const populateAccountSettings = (profile = {}) => {
  if (!profile) return;
  const email = profile.email || accountIdentity?.email || '';
  const phone = profile.phone || '';
  const preferredContact = profile.preferredContact || 'email';
  if (settingsNameInput) settingsNameInput.value = profile.name || '';
  if (settingsCompanyInput) settingsCompanyInput.value = profile.companyName || '';
  if (settingsNotesInput) settingsNotesInput.value = profile.notes || '';
  if (settingsPhoneInput) settingsPhoneInput.value = phone;
  if (settingsPreferredContactInput) settingsPreferredContactInput.value = preferredContact;
  if (currentEmailDisplay) currentEmailDisplay.value = email || 'Email pending';
  if (accountContactSummary) {
    accountContactSummary.innerHTML = `
      <div><strong>Email</strong><span>${accountEscapeHtml(email || 'Email pending')}</span></div>
      <div><strong>Phone</strong><span>${accountEscapeHtml(phone || 'Not added yet')}</span></div>
      <div><strong>Preferred</strong><span>${accountEscapeHtml(contactPreferenceLabel(preferredContact))}</span></div>
    `;
  }
};

const getSettingsProfilePayload = () => {
  const cached = loadAccountProfile() || {};
  return {
    email: accountIdentity?.email || cached.email || '',
    name: String(settingsNameInput?.value || '').trim(),
    requestedRole: cached.requestedRole || cached.defaultRole || getRequiredAccountRole() || 'customer',
    companyName: String(settingsCompanyInput?.value || '').trim(),
    companyWebsite: cached.companyWebsite || '',
    businessContext: cached.businessContext || '',
    notes: String(settingsNotesInput?.value || '').trim(),
    phone: String(settingsPhoneInput?.value || '').trim(),
    preferredContact: String(settingsPreferredContactInput?.value || 'email').trim(),
  };
};



const setLoginPasswordError = (message = '') => {
  if (loginPasswordError) {
    loginPasswordError.textContent = message;
    loginPasswordError.hidden = !message;
  }
  if (loginPasswordInput) loginPasswordInput.setAttribute('aria-invalid', message ? 'true' : 'false');
};

const isWrongPasswordError = (message = '') => /wrong password|email or password is not correct/i.test(String(message || ''));

const setLoginOtpMessage = (message = '', tone = 'pending') => {
  if (!loginOtpMessage) return;
  loginOtpMessage.textContent = message;
  loginOtpMessage.classList.toggle('status-approved', tone === 'success');
  loginOtpMessage.classList.toggle('status-warning', tone === 'error');
  loginOtpMessage.classList.toggle('status-pending', tone !== 'success' && tone !== 'error');
};

const showLoginCodeStep = (email) => {
  setLoginPasswordError('');
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


const getAuthRedirectMessage = () => 'Cloudflare Access is redirecting a public LuxeRoutes login API. Keep /login.html, /api/auth/otp, /api/account, /account.html, /owner-panel.html, and /manager-panel.html public in Cloudflare Access; protect only /admin/* and /api/admin/*.';

const normalizeLoginErrorMessage = (message = '') => {
  const normalized = String(message || '').trim();
  if (/email or password is not correct/i.test(normalized)) return 'Wrong password.';
  return normalized;
};

const readJsonOrAuthError = async (response, fallbackMessage) => {
  const contentType = response.headers.get('content-type') || '';
  const location = response.headers.get('location') || '';

  if (response.type === 'opaqueredirect' || response.redirected || (response.status >= 300 && response.status < 400) || /cloudflareaccess|cdn-cgi\/access/i.test(location)) {
    throw new Error(getAuthRedirectMessage());
  }

  const data = contentType.includes('application/json') ? await response.json().catch(() => ({})) : {};
  if (!response.ok) throw new Error(normalizeLoginErrorMessage(data.error) || fallbackMessage);
  if (!contentType.includes('application/json')) throw new Error(getAuthRedirectMessage());
  return data;
};

const setResendCooldown = (seconds = 45) => {
  if (!loginResendCode) return;
  let remaining = seconds;
  loginResendCode.disabled = true;
  const tick = () => {
    if (remaining > 0) loginResendCode.disabled = true;
    loginResendCode.textContent = remaining > 0 ? `Resend code (${remaining}s)` : 'Resend code';
    if (remaining <= 0) { loginResendCode.disabled = false; return; }
    remaining -= 1;
    window.setTimeout(tick, 1000);
  };
  tick();
};

const passwordScore = (value = '') => [value.length >= 12, /[A-Z]/.test(value), /[a-z]/.test(value), /\d/.test(value), /[^A-Za-z0-9]/.test(value)].filter(Boolean).length;

const getPasswordStrengthMessage = (value = '', matches = true) => {
  const score = passwordScore(value);
  return {
    score,
    message: `${score >= 4 ? 'Strong' : score >= 3 ? 'Good' : 'Needs work'} password · ${matches ? 'Passwords match' : 'Passwords do not match'} · Use 12+ chars, upper/lowercase, number, and symbol.`,
  };
};

const updatePasswordStrength = () => {
  if (!passwordStrength || !registerPasswordInput) return;
  const value = registerPasswordInput.value || '';
  const matches = !registerPasswordConfirm?.value || registerPasswordConfirm.value === value;
  const { score, message } = getPasswordStrengthMessage(value, matches);
  passwordStrength.dataset.strength = String(score);
  passwordStrength.textContent = message;
};

const updateResetPasswordStrength = () => {
  if (!resetPasswordStrength || !resetPasswordInput) return;
  const value = resetPasswordInput.value || '';
  const matches = !resetPasswordConfirmInput?.value || resetPasswordConfirmInput.value === value;
  const { score, message } = getPasswordStrengthMessage(value, matches);
  resetPasswordStrength.dataset.strength = String(score);
  resetPasswordStrength.textContent = message;
};

const updateAccountPasswordStrength = () => {
  if (!accountPasswordStrength || !accountNewPasswordInput) return;
  const value = accountNewPasswordInput.value || '';
  const matches = !accountNewPasswordConfirmInput?.value || accountNewPasswordConfirmInput.value === value;
  const { score, message } = getPasswordStrengthMessage(value, matches);
  accountPasswordStrength.dataset.strength = String(score);
  accountPasswordStrength.textContent = message;
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
    redirect: 'manual',
    body: JSON.stringify({ email }),
  });
  return readJsonOrAuthError(response, 'Unable to send the login code right now.');
};

const verifyLoginOtp = async (email, otp, remember = false) => {
  const response = await fetch('/api/auth/otp?action=verify', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    redirect: 'manual',
    body: JSON.stringify({ email, otp, remember }),
  });
  return readJsonOrAuthError(response, 'Unable to verify the login code right now.');
};

const loginWithPassword = async (email, password, remember = false) => {
  const response = await fetch('/api/auth/otp?action=password', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    redirect: 'manual',
    body: JSON.stringify({ email, password, remember }),
  });
  return readJsonOrAuthError(response, 'Unable to sign in with that password right now.');
};

const requestPasswordReset = async (email) => {
  const response = await fetch('/api/auth/otp?action=reset-request', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    redirect: 'manual',
    body: JSON.stringify({ email }),
  });
  return readJsonOrAuthError(response, 'Unable to send the password reset code right now.');
};

const requestMagicLink = async (email) => {
  const response = await fetch('/api/auth/otp?action=magic-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email }),
  });
  return readJsonOrAuthError(response, 'Unable to send a magic link right now.');
};

const confirmPasswordReset = async (email, otp, password) => {
  const response = await fetch('/api/auth/otp?action=reset', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    redirect: 'manual',
    body: JSON.stringify({ email, otp, password }),
  });
  return readJsonOrAuthError(response, 'Unable to reset your password right now.');
};

const requestEmailChangeCode = async (email) => {
  const response = await fetch('/api/account?action=email-change-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ email }),
  });
  return readJsonOrAuthError(response, 'Unable to send email change code right now.');
};

const confirmEmailChange = async (email, otp) => {
  const response = await fetch('/api/account?action=email-change-confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ email, otp }),
  });
  return readJsonOrAuthError(response, 'Unable to update your email right now.');
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


const offerStatusLabel = (offer = {}) => {
  const partnerStatus = offer.partnerStatus || '';
  if (partnerStatus === 'pending_review') return 'Waiting for admin approval';
  if (partnerStatus === 'changes_requested') return 'Changes requested by admin';
  if (partnerStatus === 'published') return 'Published';
  return accountEscapeHtml(partnerStatus || offer.status || 'pending_review').replaceAll('_', ' ');
};

const ownerAvailabilityRangeError = (formData) => {
  const availableFrom = String(formData.get('availableFrom') || '').trim();
  const availableTo = String(formData.get('availableTo') || '').trim();
  if (availableFrom && availableTo && availableFrom > availableTo) {
    return 'Available from must be before or the same as available to.';
  }
  return '';
};

const updateOwnerListingChecklist = () => {
  if (!ownerListingChecklist || !ownerNewOfferForm) return;
  const data = new FormData(ownerNewOfferForm);
  const has = (name) => String(data.get(name) || '').trim().length > 0;
  const checks = {
    basics: has('title') && has('stayType'),
    location: has('country') && has('region') && has('locationLabel'),
    description: has('description') && has('accommodationDetails'),
    pricing: has('priceLabel') || has('pricingDetails'),
    images: has('imageUrl') || has('galleryUrls'),
    availability: has('availableFrom') || has('availableTo') || has('availabilityNotes') || has('externalAvailabilityUrl'),
  };
  Object.entries(checks).forEach(([key, complete]) => {
    const item = ownerListingChecklist.querySelector(`[data-check="${key}"]`);
    if (item) item.dataset.complete = complete ? 'true' : 'false';
  });
};


const updateOwnerListingPreview = () => {
  if (!ownerListingPreview || !ownerNewOfferForm) return;
  const data = new FormData(ownerNewOfferForm);
  const title = String(data.get('title') || '').trim() || 'Untitled LuxeRoutes listing';
  const location = String(data.get('locationLabel') || '').trim() || [data.get('country'), data.get('region')].filter(Boolean).join(' · ') || 'Location pending';
  const price = String(data.get('priceLabel') || '').trim() || 'Pricing pending';
  const description = String(data.get('description') || '').trim() || 'Add a short public description to preview the listing story.';
  const imageUrl = String(data.get('imageUrl') || '').trim();
  const galleryUrls = String(data.get('galleryUrls') || '').split(/\n+/).map((url) => url.trim()).filter(Boolean).slice(0, 3);
  const selectedOptions = data.getAll('options').filter(Boolean).slice(0, 5);
  const stayType = String(data.get('stayType') || '').trim();
  const missing = [];
  if (!String(data.get('title') || '').trim()) missing.push('title');
  if (!String(data.get('locationLabel') || '').trim()) missing.push('location');
  if (!String(data.get('description') || '').trim()) missing.push('description');
  if (!imageUrl && !galleryUrls.length) missing.push('image');
  ownerListingPreview.innerHTML = `
    <p class="eyebrow">Live listing preview</p>
    ${imageUrl ? `<img src="${accountEscapeHtml(imageUrl)}" alt="${accountEscapeHtml(title)} preview image" loading="lazy" />` : '<div class="owner-preview-placeholder">Image pending</div>'}
    <div class="owner-preview-chips">
      ${stayType ? `<span>${accountEscapeHtml(stayType.replaceAll('-', ' '))}</span>` : '<span>Category pending</span>'}
      ${selectedOptions.map((option) => `<span>${accountEscapeHtml(String(option).replaceAll('-', ' '))}</span>`).join('')}
    </div>
    <h4>${accountEscapeHtml(title)}</h4>
    <p>${accountEscapeHtml(location)} · ${accountEscapeHtml(price)}</p>
    <span>${accountEscapeHtml(description).slice(0, 220)}</span>
    ${galleryUrls.length ? `<div class="owner-preview-gallery">${galleryUrls.map((url, index) => `<img src="${accountEscapeHtml(url)}" alt="${accountEscapeHtml(title)} gallery preview ${index + 1}" loading="lazy" />`).join('')}</div>` : ''}
    ${missing.length ? `<small class="owner-preview-missing">Still missing: ${accountEscapeHtml(missing.join(', '))}</small>` : '<small class="owner-preview-missing is-complete">Ready for LuxeRoutes review.</small>'}
  `;
};

const syncOwnerAvailabilityMinimums = (form) => {
  const fromField = form?.elements?.availableFrom;
  const toField = form?.elements?.availableTo;
  if (!fromField || !toField) return;
  toField.min = fromField.value || '';
  fromField.addEventListener('change', () => {
    toField.min = fromField.value || '';
    toField.setCustomValidity(ownerAvailabilityRangeError(new FormData(form)));
  });
  toField.addEventListener('change', () => {
    toField.setCustomValidity(ownerAvailabilityRangeError(new FormData(form)));
  });
  toField.setCustomValidity(ownerAvailabilityRangeError(new FormData(form)));
};

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

const requestStatusOptions = ['new', 'in_progress', 'waiting', 'approved', 'resolved', 'closed', 'declined'];

const renderManagerRequestCounts = (requests = []) => {
  if (!managerRequestCounts) return;
  const count = (status) => requests.filter((request) => (request.status || 'new') === status).length;
  managerRequestCounts.innerHTML = [
    ['All', requests.length],
    ['New', count('new')],
    ['In progress', count('in_progress')],
    ['Waiting', count('waiting')],
    ['Resolved', count('resolved') + count('closed')],
  ].map(([label, value]) => `<span><strong>${accountEscapeHtml(value)}</strong>${accountEscapeHtml(label)}</span>`).join('');
};

const getFilteredRoleRequests = (role, inquiries = []) => {
  if (role !== 'manager') return inquiries;
  const statusFilter = managerRequestFilter?.value || 'all';
  if (statusFilter === 'all') return inquiries;
  return inquiries.filter((inquiry) => (inquiry.status || 'new') === statusFilter);
};

const renderRoleRequests = (target, inquiries = [], emptyMessage = 'No customer requests yet.', role = '') => {
  if (!target) return;
  const filteredInquiries = getFilteredRoleRequests(role, inquiries);
  if (role === 'manager') renderManagerRequestCounts(inquiries);
  if (!filteredInquiries.length) {
    target.innerHTML = `<p class="empty-state">${accountEscapeHtml(role === 'manager' && inquiries.length ? 'No requests match this status filter.' : emptyMessage)}</p>`;
    return;
  }

  target.innerHTML = filteredInquiries.map((inquiry) => {
    const payload = parseInquiryPayload(inquiry);
    const dates = [payload.start_date || payload.check_in || payload.from, payload.end_date || payload.check_out || payload.to]
      .filter(Boolean)
      .join(' → ');
    const status = inquiry.status || 'new';
    return `
      <div class="stack-item">
        <div>
          <strong>${accountEscapeHtml(inquiry.offerTitle || payload.offer || payload.property_name || 'Property request')}</strong>
          <span>${accountEscapeHtml(inquiry.name || payload.name || 'Unnamed customer')} · ${accountEscapeHtml(getInquiryContact(inquiry, payload))}</span>
          ${dates ? `<span>Dates: ${accountEscapeHtml(dates)}</span>` : ''}
          ${payload.guests ? `<span>Guests: ${accountEscapeHtml(payload.guests)}</span>` : ''}
          ${payload.message || payload.notes ? `<span>Request: ${accountEscapeHtml(payload.message || payload.notes)}</span>` : ''}
        </div>
        ${role ? `<label class="mini-field">Request status<select data-role-request-status data-role="${accountEscapeHtml(role)}" data-id="${accountEscapeHtml(inquiry.id || '')}" aria-label="Request status for ${accountEscapeHtml(inquiry.offerTitle || payload.offer || 'customer request')}">${requestStatusOptions.map((option) => `<option value="${option}" ${status === option ? 'selected' : ''}>${accountEscapeHtml(option.replaceAll('_', ' '))}</option>`).join('')}</select></label>` : `<span class="status-pill ${['approved', 'resolved', 'closed'].includes(status) ? 'status-approved' : status === 'declined' ? 'status-warning' : 'status-pending'}">${accountEscapeHtml(status.replaceAll('_', ' '))}</span>`}
        ${role === 'manager' ? `<form class="account-inline-form manager-request-note-form" data-manager-request-note-form data-id="${accountEscapeHtml(inquiry.id || '')}"><label>Contact status<select name="managerContactStatus"><option value="">Not set</option>${['new', 'customer_contacted', 'owner_contacted', 'waiting_customer', 'waiting_owner', 'resolved'].map((option) => `<option value="${option}" ${(inquiry.managerContactStatus || '') === option ? 'selected' : ''}>${accountEscapeHtml(option.replaceAll('_', ' '))}</option>`).join('')}</select></label><label>Follow-up date<input type="date" name="managerFollowUpAt" value="${accountEscapeHtml(inquiry.managerFollowUpAt || '')}" /></label><label class="full">Manager note<textarea name="managerNote" rows="2" placeholder="Private follow-up note for this request">${accountEscapeHtml(inquiry.managerNote || '')}</textarea></label><button class="mini-action" type="submit">Save follow-up</button></form>` : ''}
      </div>
    `;
  }).join('');
};

const renderOwnerOfferForm = (offer = {}) => `
  <form class="account-inline-form" data-owner-offer-form data-offer-id="${accountEscapeHtml(offer.id || '')}">
    <label>Guest / group label <input type="text" name="guestLabel" value="${accountEscapeHtml(offer.guestLabel || '')}" placeholder="Up to 8 guests, 2–12 people, private group..." /></label>
    <label>Image alt text <input type="text" name="imageAlt" value="${accountEscapeHtml(offer.imageAlt || '')}" placeholder="Elegant villa terrace overlooking Lake Bled" /></label>
    <label>Available from <input type="date" name="availableFrom" value="${accountEscapeHtml(offer.availableFrom || '')}" /></label>
    <label>Available to <input type="date" name="availableTo" value="${accountEscapeHtml(offer.availableTo || '')}" /></label>
    <label>Price label <input type="text" name="priceLabel" value="${accountEscapeHtml(offer.priceLabel || '')}" placeholder="From €650/night" /></label>
    <label>Pricing details <textarea name="pricingDetails" rows="3" placeholder="Seasonal prices, fees, deposit, payment terms">${accountEscapeHtml(offer.pricingDetails || '')}</textarea></label>
    <label>Discount <input type="text" name="discountLabel" value="${accountEscapeHtml(offer.discountLabel || '')}" placeholder="10% for 7+ nights" /></label>
    <label>Availability notes <textarea name="availabilityNotes" rows="3" placeholder="Peak dates, blocked dates, seasonal notes">${accountEscapeHtml(offer.availabilityNotes || '')}</textarea></label>
    <label>External availability URL <input type="url" name="externalAvailabilityUrl" value="${accountEscapeHtml(offer.externalAvailabilityUrl || '')}" placeholder="https://calendar.example.com" /></label>
    <label>Accommodation details <textarea name="accommodationDetails" rows="3" placeholder="Rooms, amenities, rules, services">${accountEscapeHtml(offer.accommodationDetails || '')}</textarea></label>
    <label>Main image URL <input type="url" name="imageUrl" value="${accountEscapeHtml(offer.imageUrl || '')}" placeholder="https://…" /></label>
    <label>Upload main image <input type="file" name="mainImageUpload" accept="image/jpeg,image/png,image/webp,image/gif" data-owner-image-upload data-image-target="imageUrl" /></label>
    <label>Gallery URLs <textarea name="galleryUrls" rows="3" placeholder="One image URL per line">${accountEscapeHtml(offer.galleryUrls || '')}</textarea></label>
    <label>Upload gallery images <input type="file" name="galleryImageUpload" accept="image/jpeg,image/png,image/webp,image/gif" data-owner-image-upload data-image-target="galleryUrls" multiple /></label>
    <label class="full">Short public description <textarea name="description" rows="3" placeholder="Describe the listing, setting, experience, and ideal guest">${accountEscapeHtml(offer.description || '')}</textarea></label>
    <p class="status-pill status-pending" data-owner-offer-status>Saved updates return this listing to the LuxeRoutes review queue before publishing changes.</p>
    <button class="btn btn-secondary" type="submit">Save listing updates</button>
  </form>
`;

const renderOfferImages = (offer = {}) => {
  const urls = [offer.imageUrl, ...String(offer.galleryUrls || '').split(/\n+/)]
    .map((url) => String(url || '').trim())
    .filter(Boolean)
    .slice(0, 6);
  if (!urls.length) return '';
  return `<div class="owner-offer-images">${urls.map((url, index) => `<a href="${accountEscapeHtml(url)}" target="_blank" rel="noopener noreferrer"><img src="${accountEscapeHtml(url)}" alt="${accountEscapeHtml(index === 0 ? (offer.imageAlt || offer.title || 'Listing image') : `${offer.title || 'Listing'} gallery image ${index}`)}" loading="lazy" width="120" height="80" /></a>`).join('')}</div>`;
};

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
        ${offer.externalAvailabilityUrl ? `<span>Availability sync: ${accountEscapeHtml(offer.externalAvailabilityUrl)}</span>` : ''}
        ${offer.pricingDetails ? `<span>Pricing details: ${accountEscapeHtml(offer.pricingDetails)}</span>` : ''}
        ${offer.ownerEmail ? `<span>Owner: ${accountEscapeHtml(offer.ownerEmail)}</span>` : ''}
        ${offer.managerEmail ? `<span>Manager: ${accountEscapeHtml(offer.managerEmail)}</span>` : ''}
        ${offer.ownerNotes ? `<span>Owner note: ${accountEscapeHtml(offer.ownerNotes)}</span>` : ''}
        ${offer.managerNotes ? `<span>Manager note: ${accountEscapeHtml(offer.managerNotes)}</span>` : ''}
        ${offer.ownerFollowUpAt || offer.ownerFollowUpStatus ? `<span>Owner follow-up: ${accountEscapeHtml([offer.ownerFollowUpAt, String(offer.ownerFollowUpStatus || '').replaceAll('_', ' ')].filter(Boolean).join(' · '))}</span>` : ''}
        ${offer.managerFollowUpAt || offer.managerFollowUpStatus ? `<span>Manager follow-up: ${accountEscapeHtml([offer.managerFollowUpAt, String(offer.managerFollowUpStatus || '').replaceAll('_', ' ')].filter(Boolean).join(' · '))}</span>` : ''}
        ${renderOfferImages(offer)}
      </div>
      <span class="status-pill ${offer.status === 'published' ? 'status-approved' : 'status-pending'}">${accountEscapeHtml(offer.status || 'draft')}</span>
      ${role === 'owner' ? renderOwnerOfferForm(offer) : ''}
    </div>
  `).join('');
  target.querySelectorAll('[data-owner-offer-form]').forEach(syncOwnerAvailabilityMinimums);
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
    roleRequestCache[role] = inquiries;
    renderRoleRequests(target, inquiries, role === 'owner'
      ? 'No customer stay requests are connected to your properties yet.'
      : 'No customer stay requests are connected to your assigned properties yet.', role);
  } catch (error) {
    roleRequestCache[role] = [];
    renderRoleRequests(target, [], error.message || 'Unable to load customer requests.', role);
  }
};


const updateRoleRequestStatus = async (role, id, status) => {
  const endpoint = role === 'owner' ? '/api/owner/inquiries' : role === 'manager' ? '/api/manager/inquiries' : '';
  if (!endpoint || !id) throw new Error('Unable to identify this request.');

  const response = await fetch(endpoint, {
    method: 'PATCH',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ id, status }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Unable to update request status.');
  return data.inquiry;
};

const setOwnerNewOfferStatus = (message = '', tone = 'pending') => {
  if (!ownerNewOfferStatus) return;
  ownerNewOfferStatus.textContent = message;
  ownerNewOfferStatus.classList.toggle('status-approved', tone === 'success');
  ownerNewOfferStatus.classList.toggle('status-warning', tone === 'error');
  ownerNewOfferStatus.classList.toggle('status-pending', tone !== 'success' && tone !== 'error');
};

const ownerAllowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ownerMaxImageBytes = 8 * 1024 * 1024;

const setOwnerFormStatus = (form, message = '', tone = 'pending') => {
  const status = form?.querySelector?.('[data-owner-offer-status]');
  if (!status) {
    setOwnerNewOfferStatus(message, tone);
    return;
  }
  status.textContent = message;
  status.classList.toggle('status-approved', tone === 'success');
  status.classList.toggle('status-warning', tone === 'error');
  status.classList.toggle('status-pending', tone !== 'success' && tone !== 'error');
};

const validateOwnerImageFile = (file) => {
  if (!ownerAllowedImageTypes.includes(file.type)) return 'Upload a JPG, PNG, WebP, or GIF image.';
  if (file.size <= 0) return 'The selected image is empty.';
  if (file.size > ownerMaxImageBytes) return 'Images must be 8 MB or smaller.';
  return '';
};

const appendUploadedImageUrl = (form, targetName, url) => {
  const field = form?.elements?.namedItem(targetName);
  if (!field || !url) return;
  if (field.tagName === 'TEXTAREA') {
    const urls = String(field.value || '').split(/\n+/).map((item) => item.trim()).filter(Boolean);
    if (!urls.includes(url)) urls.push(url);
    field.value = urls.join('\n');
    return;
  }
  field.value = url;
};

const uploadOwnerImageFile = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  const response = await fetch('/api/owner/images', {
    method: 'POST',
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Unable to upload this image.');
  return data.url;
};

const payloadFromTextFields = (formData) => {
  const payload = {};
  formData.forEach((value, key) => {
    if (value instanceof File) return;
    payload[key] = value;
  });
  return payload;
};

const loadRolePanelOffers = async (role) => {
  const endpoint = role === 'owner' ? '/api/owner/offers' : role === 'manager' ? '/api/manager/offers' : '';
  const target = role === 'owner' ? ownerOffersTarget : role === 'manager' ? managerOffersTarget : null;
  if (!endpoint || !target) return;

  try {
    const offers = await fetchRoleCollection(endpoint, 'offers');
    renderRoleOffers(target, offers, role === 'owner'
      ? 'No listings are assigned to your owner email yet.'
      : 'No listings are assigned to your manager email yet.', role);
  } catch (error) {
    renderRoleOffers(target, [], error.message || 'Unable to load assigned offers.', role);
  }

  await loadRolePanelRequests(role);
};


if (ownerNewOfferForm) {
  syncOwnerAvailabilityMinimums(ownerNewOfferForm);
  updateOwnerListingChecklist();
  updateOwnerListingPreview();
  ownerNewOfferForm.addEventListener('input', () => { updateOwnerListingChecklist(); updateOwnerListingPreview(); });
  ownerNewOfferForm.addEventListener('change', () => { updateOwnerListingChecklist(); updateOwnerListingPreview(); });
}

ownerNewOfferForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submitButton = ownerNewOfferForm.querySelector('[type="submit"]');
  const formData = new FormData(ownerNewOfferForm);
  const availabilityError = ownerAvailabilityRangeError(formData);
  if (availabilityError) {
    setOwnerNewOfferStatus(availabilityError, 'error');
    return;
  }
  const payload = payloadFromTextFields(formData);
  payload.options = formData.getAll('options');
  submitButton.disabled = true;
  setOwnerNewOfferStatus('Submitting your offer for admin review…');

  try {
    const response = await fetch('/api/owner/offers', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Unable to submit this offer.');
    ownerNewOfferForm.reset();
    setOwnerNewOfferStatus('Listing submitted. Admin can now review, approve, publish, and assign a manager.', 'success');
    await loadRolePanelOffers('owner');
  } catch (error) {
    setOwnerNewOfferStatus(error.message || 'Unable to submit this offer.', 'error');
  } finally {
    submitButton.disabled = false;
  }
});

document.addEventListener('change', async (event) => {
  const input = event.target.closest?.('[data-owner-image-upload]');
  if (!input) return;

  const form = input.form;
  const files = Array.from(input.files || []);
  if (!form || files.length === 0) return;

  input.disabled = true;
  const validationError = files.map(validateOwnerImageFile).find(Boolean);
  if (validationError) {
    setOwnerFormStatus(form, validationError, 'error');
    input.value = '';
    input.disabled = false;
    return;
  }
  setOwnerFormStatus(form, `Uploading ${files.length === 1 ? 'image' : `${files.length} images`}…`);
  try {
    for (const file of files) {
      const url = await uploadOwnerImageFile(file);
      appendUploadedImageUrl(form, input.dataset.imageTarget, url);
    }
    setOwnerFormStatus(form, 'Image upload complete. Uploaded URL fields were filled automatically.', 'success');
    input.value = '';
  } catch (error) {
    setOwnerFormStatus(form, error.message || 'Unable to upload image.', 'error');
  } finally {
    input.disabled = false;
  }
});


document.addEventListener('change', async (event) => {
  const select = event.target.closest('[data-role-request-status]');
  if (!select) return;

  select.disabled = true;
  try {
    await updateRoleRequestStatus(select.dataset.role, select.dataset.id, select.value);
    await loadRolePanelRequests(select.dataset.role);
  } catch (error) {
    window.alert(error.message || 'Unable to update request status.');
    await loadRolePanelRequests(select.dataset.role);
  } finally {
    select.disabled = false;
  }
});

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
    profile.phone ? `Phone: ${accountEscapeHtml(profile.phone)}` : '',
    profile.preferredContact ? `Preferred contact: ${accountEscapeHtml(contactPreferenceLabel(profile.preferredContact))}` : '',
    profile.businessContext ? `Context: ${accountEscapeHtml(profile.businessContext)}` : '',
    profile.companyWebsite ? `Website: <a href="${accountEscapeHtml(profile.companyWebsite)}" target="_blank" rel="noopener">${accountEscapeHtml(profile.companyWebsite)}</a>` : '',
  ].filter(Boolean).map((item) => `<span>${item}</span>`).join('');

  populateAccountSettings(profile);
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


const setRegisterProgressStep = (step = 'profile') => {
  if (!registerProgress) return;
  const order = { profile: 1, verify: 2, done: 3 };
  const activeIndex = order[step] || order.verify;
  registerProgress.querySelectorAll('[data-register-progress-step]').forEach((item) => {
    const itemStep = item.dataset.registerProgressStep || 'verify';
    item.classList.toggle('is-active', (order[itemStep] || 0) <= activeIndex);
  });
};

const setAccountFormBusy = (busy = false) => {
  if (!accountForm) return;
  accountForm.setAttribute('aria-busy', busy ? 'true' : 'false');
  if (accountSubmit) accountSubmit.disabled = busy;
};

const getRegisterValidationMessage = (profile = {}) => {
  if (!profile.email || !profile.email.includes('@')) return 'Enter a valid email address.';
  if (!profile.name) return 'Enter your full name.';
  if (!profile.password || profile.password.length < 8) return 'Create a password with at least 8 characters.';
  if (profile.passwordConfirm !== undefined && profile.password !== profile.passwordConfirm) return 'Password confirmation must match.';
  if (profile.password && passwordScore(profile.password) < 3) return 'Use a stronger password with at least three of: 12+ characters, uppercase, lowercase, number, symbol.';
  return '';
};

const setAccountStatus = ({ heading, status, email, role, approved }) => {
  const canPrefillEmailInput = email && email.includes('@');
  const accountHref = getRoleHomePath(role);

  if (accountHeading) accountHeading.textContent = heading;
  if (accountStatus) accountStatus.textContent = status;
  if (accountEmail) accountEmail.textContent = email || 'Email pending';
  if (accountEmailInput && canPrefillEmailInput) {
    accountEmailInput.value = email;
  }
  if (accountEmailInput && isRegisterPage()) accountEmailInput.readOnly = Boolean(canPrefillEmailInput && approved);
  if (accountForm && isRegisterPage()) accountForm.hidden = false;
  if (isRegisterPage()) setRegisterProgressStep(email && approved ? 'verify' : 'profile');
  if (accountRole) {
    accountRole.textContent = getAccountRoleLabel(role);
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

const getVerifiedRoleLabel = (role) => ({
  owner: 'Owner access confirmed',
  manager: 'Manager access confirmed',
  admin: 'Admin access confirmed',
  customer: 'Customer access confirmed',
  partner: 'Partner access confirmed',
}[normalizeAccountRole(role)] || 'Email verified');

const getAccountStatusCopy = (remoteAccount = {}, profile = null) => {
  const role = normalizeAccountRole(remoteAccount.role || remoteAccount.grant?.role || profile?.defaultRole || profile?.requestedRole);
  if (remoteAccount.accessStatus === 'pending_admin_grant' || remoteAccount.accessStatus === 'pending_review') {
    return 'Your profile is saved. Owner or manager dashboard access is pending LuxeRoutes review.';
  }
  if (role === 'owner') return 'Your verified email is assigned the Owner role. This owner workspace is ready.';
  if (role === 'manager') return 'Your verified email is assigned the Manager role. This manager workspace is ready.';
  if (role === 'admin') return 'Your verified email is assigned the Admin role. Admin and role dashboards are available.';
  if (role === 'customer' && profile) return 'Your verified email is assigned the Customer role. Your LuxeRoutes account dashboard is ready.';

  if (!profile) {
    return isLoginPage()
      ? 'Your LuxeRoutes OTP session is active. Open your account to finish setup.'
      : 'Your email is verified. Create your profile to request customer, owner, or manager access.';
  }

  return 'Your email is verified and your LuxeRoutes profile is ready.';
};

const applyRemoteAccount = (remoteAccount) => {
  accountIdentity = { email: remoteAccount.identityEmail, role: remoteAccount.role };
  const profile = remoteAccount.profile || null;
  const role = remoteAccount.role || remoteAccount.grant?.role || profile?.defaultRole || 'customer';
  saveAccountSession({ identity: accountIdentity, profile, grant: remoteAccount.grant, role: remoteAccount.role });
  setAccountStatus({
    heading: remoteAccount.accessStatus === 'pending_admin_grant' || remoteAccount.accessStatus === 'pending_review'
      ? 'Access pending review'
      : getVerifiedRoleLabel(role),
    status: getAccountStatusCopy(remoteAccount, profile),
    email: remoteAccount.identityEmail,
    role,
    approved: true,
  });
  populateAccountSettings(profile);
  renderAccountProfile(profile, remoteAccount.grant);
  renderAffiliateDashboard();
  loadAccountActivity();
  setLoginAccountState(true);
  if (redirectToRoleHomeIfNeeded(remoteAccount.role || remoteAccount.grant?.role || profile?.defaultRole)) return true;
  return true;
};

const setAffiliateLinkBuilderEnabled = (enabled = false, message = '') => {
  if (affiliateLinkSubmit) affiliateLinkSubmit.disabled = !enabled;
  if (affiliateLinkCard) affiliateLinkCard.dataset.affiliateLinkEnabled = enabled ? 'true' : 'false';
  if (affiliateLinkStatus) {
    affiliateLinkStatus.textContent = enabled ? 'Active' : 'Approval required';
    affiliateLinkStatus.classList.toggle('status-approved', enabled);
    affiliateLinkStatus.classList.toggle('status-pending', !enabled);
  }
  if (message && affiliateLinkOutput) affiliateLinkOutput.textContent = message;
};

const renderAffiliateStatusState = (affiliate = null) => {
  const status = String(affiliate?.status || 'not_applied').toLowerCase();
  const isActive = status === 'active';
  const statusCopy = {
    not_applied: {
      label: 'Not applied',
      heading: 'Affiliate application required',
      body: 'Apply for affiliate review before referral links can be activated for tracking.',
      code: 'Apply first',
      action: '<a class="btn btn-secondary" href="become-affiliate.html">Apply for affiliate review</a>',
    },
    pending_review: {
      label: 'Pending review',
      heading: 'Application waiting for approval',
      body: 'Your referral code is reserved, but tracking starts only after LuxeRoutes activates your affiliate account.',
      code: affiliate?.referralCode || 'Reserved after review',
      action: '<a class="btn btn-secondary" href="become-affiliate.html">Update application</a>',
    },
    active: {
      label: 'Active',
      heading: 'Affiliate links are active',
      body: 'Create referral links below and share them with qualified travelers. Visits and inquiries will count in this dashboard.',
      code: affiliate?.referralCode || 'Active',
      action: '<a class="btn btn-primary" href="#affiliate-links">Create referral link</a>',
    },
    paused: {
      label: 'Paused',
      heading: 'Affiliate tracking is paused',
      body: 'Your code is on file, but new visits and inquiries are not being tracked while the affiliate account is paused.',
      code: affiliate?.referralCode || 'Paused',
      action: '<a class="btn btn-secondary" href="mailto:info@luxeroutes.eu">Contact LuxeRoutes</a>',
    },
    rejected: {
      label: 'Rejected',
      heading: 'Application not approved',
      body: 'You can update your audience and promotion plan if you would like LuxeRoutes to review the application again.',
      code: affiliate?.referralCode || 'Not active',
      action: '<a class="btn btn-secondary" href="become-affiliate.html">Update application</a>',
    },
  }[status] || null;
  const copy = statusCopy || {
    label: status.replaceAll('_', ' '),
    heading: 'Affiliate status needs review',
    body: 'Contact LuxeRoutes if this affiliate status does not look right.',
    code: affiliate?.referralCode || 'Unavailable',
    action: '<a class="btn btn-secondary" href="mailto:info@luxeroutes.eu">Contact LuxeRoutes</a>',
  };

  if (affiliateStatusCard) {
    affiliateStatusCard.dataset.affiliateStatus = status;
    affiliateStatusCard.innerHTML = `
      <div class="card-head">
        <p class="eyebrow">Affiliate status</p>
        <span class="status-pill ${isActive ? 'status-approved' : status === 'rejected' || status === 'paused' ? 'status-warning' : 'status-pending'}">${accountEscapeHtml(copy.label)}</span>
      </div>
      <h3>${accountEscapeHtml(copy.heading)}</h3>
      <p class="admin-helper">${accountEscapeHtml(copy.body)}</p>
      <div class="affiliate-code-card">
        <span>Referral code</span>
        <strong data-affiliate-code>${accountEscapeHtml(copy.code)}</strong>
      </div>
      <div class="button-row" data-affiliate-next-step>${copy.action}</div>
    `;
  } else if (affiliateCodeOutput) {
    affiliateCodeOutput.textContent = copy.code;
  }
  if (affiliateNextStep) affiliateNextStep.innerHTML = copy.action;
  document.body.dataset.affiliateActive = isActive ? 'true' : 'false';
  document.body.dataset.affiliateCode = isActive ? (affiliate?.referralCode || '') : '';
  setAffiliateLinkBuilderEnabled(isActive, isActive
    ? 'Enter a LuxeRoutes page URL and generate your tracked referral link.'
    : 'Referral link generation unlocks after affiliate approval and activation.');
};

const renderAffiliateActivity = (events = []) => {
  if (!affiliateActivity) return;
  if (!events.length) {
    affiliateActivity.innerHTML = '<p class="empty-state">No affiliate activity recorded yet.</p>';
    return;
  }
  affiliateActivity.innerHTML = events.map((event) => `
    <div class="stack-item">
      <div>
        <strong>${accountEscapeHtml(String(event.eventType || 'event').replaceAll('_', ' '))}</strong>
        <span>${accountEscapeHtml(event.targetUrl || 'LuxeRoutes page')}</span>
        ${event.sourceUrl ? `<span>Source: ${accountEscapeHtml(event.sourceUrl)}</span>` : ''}
        ${event.inquiryId ? `<span>Inquiry: ${accountEscapeHtml(event.inquiryId)}</span>` : ''}
      </div>
      <span class="status-pill">${accountEscapeHtml(event.createdAt ? new Date(event.createdAt).toLocaleDateString() : 'Recent')}</span>
    </div>
  `).join('');
};

const renderAffiliateDashboard = async () => {
  if (!isAffiliatePage()) return;
  try {
    const response = await fetchAccountAuth('/api/affiliate/stats', {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
      redirect: 'manual',
    });
    const data = await readJsonOrAuthError(response, 'Unable to load affiliate dashboard.');
    const affiliate = data.affiliate || null;
    const stats = data.stats || {};
    const recentEvents = Array.isArray(data.recentEvents) ? data.recentEvents : [];
    renderAffiliateStatusState(affiliate);
    renderAffiliateActivity(recentEvents);
    if (!affiliate) {
      if (affiliateHeading) affiliateHeading.textContent = 'Affiliate application required';
      if (affiliateMessage) affiliateMessage.innerHTML = 'Apply for affiliate access first. <a href="become-affiliate.html">Become an Affiliate</a>';
      if (affiliateStatus) affiliateStatus.textContent = 'Not applied';
      if (affiliateVisits) affiliateVisits.textContent = '0';
      if (affiliateInquiries) affiliateInquiries.textContent = '0';
      if (affiliateTotal) affiliateTotal.textContent = '0';
      renderAffiliateActivity([]);
      return;
    }

    const affiliateIsActive = affiliate.status === 'active';
    if (affiliateHeading) affiliateHeading.textContent = affiliateIsActive ? 'Affiliate access active' : 'Affiliate review status';
    if (affiliateMessage) affiliateMessage.textContent = affiliateIsActive
      ? `Referral code: ${affiliate.referralCode}`
      : `Your affiliate application is ${String(affiliate.status || 'pending_review').replaceAll('_', ' ')}. Tracking starts after activation.`;
    if (affiliateStatus) {
      affiliateStatus.textContent = String(affiliate.status || 'pending_review').replaceAll('_', ' ');
      affiliateStatus.classList.toggle('status-approved', affiliateIsActive);
      affiliateStatus.classList.toggle('status-pending', !affiliateIsActive && affiliate.status !== 'rejected' && affiliate.status !== 'paused');
      affiliateStatus.classList.toggle('status-warning', affiliate.status === 'rejected' || affiliate.status === 'paused');
    }
    if (affiliateVisits) affiliateVisits.textContent = String(stats.visits || 0);
    if (affiliateInquiries) affiliateInquiries.textContent = String(stats.inquiries || 0);
    if (affiliateTotal) affiliateTotal.textContent = String(stats.totalEvents || 0);
  } catch (error) {
    if (affiliateHeading) affiliateHeading.textContent = 'Affiliate dashboard unavailable';
    if (affiliateMessage) affiliateMessage.textContent = error.message || 'Unable to load affiliate dashboard right now.';
  }
};

affiliateTargetPreset?.addEventListener('change', () => {
  if (!affiliateTargetInput) return;
  const value = affiliateTargetPreset.value;
  if (!value) return;
  affiliateTargetInput.value = new URL(value, window.location.origin).href;
});

affiliateCopyLink?.addEventListener('click', async () => {
  const link = document.body.dataset.affiliateGeneratedLink || '';
  if (!link) return;
  try {
    await navigator.clipboard.writeText(link);
    if (affiliateLinkOutput) affiliateLinkOutput.textContent = 'Referral link copied to clipboard.';
  } catch (error) {
    if (affiliateLinkOutput) affiliateLinkOutput.textContent = link;
  }
});

affiliateLinkForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const code = document.body.dataset.affiliateCode || '';
  const isActive = document.body.dataset.affiliateActive === 'true';
  const formData = new FormData(affiliateLinkForm);
  const target = String(formData.get('target') || window.location.origin || 'https://luxeroutes.eu').trim();
  if (!code || !isActive) {
    if (affiliateLinkOutput) affiliateLinkOutput.textContent = 'Referral links unlock after LuxeRoutes approves and activates your affiliate account.';
    return;
  }
  try {
    const url = new URL(target, window.location.origin);
    url.searchParams.set('ref', code);
    document.body.dataset.affiliateGeneratedLink = url.href;
    if (affiliateLinkOutput) affiliateLinkOutput.innerHTML = `Referral link: <a href="${accountEscapeHtml(url.href)}" target="_blank" rel="noopener">${accountEscapeHtml(url.href)}</a>`;
    if (affiliateCopyLink) affiliateCopyLink.hidden = false;
  } catch (error) {
    if (affiliateLinkOutput) affiliateLinkOutput.textContent = 'Enter a valid LuxeRoutes destination URL.';
  }
});

const getInquiryPayload = (inquiry = {}) => {
  try { return JSON.parse(inquiry.payloadJson || '{}') || {}; } catch (error) { return {}; }
};


const customerOfferStatusClass = (status = '') => {
  if (['won', 'owner_confirmed', 'customer_interested'].includes(status)) return 'status-approved';
  if (['lost', 'expired', 'cancelled'].includes(status)) return 'status-warning';
  return 'status-pending';
};

const renderAccountCustomerOffers = (customerOffers = []) => {
  if (!accountCustomerOffers) return;
  if (!customerOffers.length) {
    accountCustomerOffers.innerHTML = '<div class="stack-item"><div><strong>No private offers yet</strong><span>Request an offer and LuxeRoutes will prepare a proposal when owner pricing is available.</span></div><span class="status-pill status-pending">Waiting</span></div>';
    return;
  }
  accountCustomerOffers.innerHTML = customerOffers.map((offer) => {
    const status = String(offer.status || 'sent').replaceAll('_', ' ');
    const price = Number(offer.ownerPriceAmount || 0) > 0 ? `${accountEscapeHtml(offer.currency || 'EUR')} ${Number(offer.ownerPriceAmount).toLocaleString()}` : 'Owner price pending';
    const details = [offer.destinationLabel, offer.includedItems, offer.couponLabel || offer.perkLabel, offer.expiresAt ? `Valid until ${offer.expiresAt}` : ''].filter(Boolean).join(' · ');
    const canRespond = ['sent', 'changes_requested'].includes(offer.status || 'sent');
    return `<div class="stack-item stack-item-vertical" data-customer-offer-card>
      <div>
        <strong>${accountEscapeHtml(offer.title || 'Private LuxeRoutes proposal')}</strong>
        <span>${price}</span>
        ${details ? `<span>${accountEscapeHtml(details).slice(0, 260)}</span>` : ''}
        ${offer.customerMessage ? `<span>${accountEscapeHtml(offer.customerMessage).slice(0, 260)}</span>` : ''}
      </div>
      <span class="status-pill ${customerOfferStatusClass(offer.status)}">${accountEscapeHtml(status)}</span>
      ${canRespond ? `<form class="account-inline-form proposal-response-form" data-customer-offer-response-form data-id="${accountEscapeHtml(offer.id || '')}"><label class="full">Message to concierge<textarea name="message" rows="2" placeholder="Ask a question or tell us what you would like to adjust"></textarea></label><div class="button-row"><button class="mini-action" type="submit" name="action" value="customer_interested">I'm interested</button><button class="mini-action" type="submit" name="action" value="changes_requested">Request changes</button><button class="mini-action" type="submit" name="action" value="declined">Not interested</button></div></form>` : ''}
    </div>`;
  }).join('');
};

const couponStatusClass = (status = '') => ['active'].includes(status) ? 'status-approved' : ['expired', 'revoked'].includes(status) ? 'status-warning' : 'status-pending';

const renderAccountCoupons = (coupons = []) => {
  if (!accountCoupons) return;
  if (!coupons.length) {
    accountCoupons.innerHTML = '<div class="stack-item"><div><strong>No active coupons</strong><span>Ask LuxeRoutes to attach a private code to your verified email.</span></div><span class="status-pill">0 codes</span></div>';
    return;
  }
  accountCoupons.innerHTML = coupons.map((coupon) => {
    const status = String(coupon.status || 'active').replaceAll('_', ' ');
    const expires = coupon.expiresAt ? `Expires ${accountEscapeHtml(coupon.expiresAt)}` : 'No expiry set';
    return `<div class="stack-item"><div><strong>${accountEscapeHtml(coupon.title || 'Private LuxeRoutes code')}</strong><span><code>${accountEscapeHtml(coupon.code || '')}</code> · ${accountEscapeHtml(coupon.description || expires)}</span><span>${expires}</span></div><span class="status-pill ${couponStatusClass(coupon.status)}">${accountEscapeHtml(status)}</span></div>`;
  }).join('');
};

const renderAccountSavedOffers = (inquiries = []) => {
  if (!accountSavedOffers) return;
  if (!inquiries.length) {
    accountSavedOffers.innerHTML = '<div class="stack-item"><div><strong>No saved offers yet</strong><span>Approved travel proposals and submitted inquiries for your email will appear here.</span></div><span class="status-pill status-pending">Waiting</span></div>';
    return;
  }
  accountSavedOffers.innerHTML = inquiries.map((inquiry) => {
    const payload = getInquiryPayload(inquiry);
    const title = inquiry.offerTitle || payload.offer || payload.property_name || payload.accommodation_interest || inquiry.inquiryType || 'LuxeRoutes inquiry';
    const detail = payload.message || payload.notes || payload.travel_style || payload.destination || inquiry.submittedFrom || 'Request received by LuxeRoutes.';
    const status = String(inquiry.status || 'new').replaceAll('_', ' ');
    return `<div class="stack-item"><div><strong>${accountEscapeHtml(title)}</strong><span>${accountEscapeHtml(detail).slice(0, 180)}</span><span>Submitted ${accountEscapeHtml(inquiry.createdAt ? new Date(inquiry.createdAt).toLocaleDateString() : 'recently')}</span></div><span class="status-pill ${['approved', 'resolved', 'closed'].includes(inquiry.status) ? 'status-approved' : inquiry.status === 'declined' ? 'status-warning' : 'status-pending'}">${accountEscapeHtml(status)}</span></div>`;
  }).join('');
};

const loadAccountActivity = async () => {
  if (!accountSavedOffers || !isDashboardPage()) return;
  try {
    const response = await fetchAccountAuth('/api/account?action=activity', { headers: { Accept: 'application/json' }, credentials: 'same-origin', redirect: 'manual' });
    const data = await readJsonOrAuthError(response, 'Unable to load saved offers and inquiries.');
    renderAccountCustomerOffers(Array.isArray(data.customerOffers) ? data.customerOffers : []);
    renderAccountSavedOffers(Array.isArray(data.inquiries) ? data.inquiries : []);
    renderAccountCoupons(Array.isArray(data.coupons) ? data.coupons : []);
  } catch (error) {
    renderAccountCustomerOffers([]);
    renderAccountSavedOffers([]);
    renderAccountCoupons([]);
  }
};

const initialiseAccount = async () => {
  const cachedSession = loadAccountSession();
  const hasCachedSession = hasVerifiedAccountSession(cachedSession);
  const localPreview = isAccountLocalPreview();
  const queryParams = new URLSearchParams(window.location.search);
  const loggedOut = queryParams.has('logged_out');
  const loginError = queryParams.get('error');
  setLoginAccountState(false);

  const remoteAccount = await loadRemoteAccountProfile();
  if (remoteAccount?.identityEmail) {
    applyRemoteAccount(remoteAccount);
    return;
  }

  const identity = await getAccessIdentity();
  if (identity) accountIdentity = identity;

  if (hasCachedSession) {
    const restored = restoreCachedAccountSession(
      cachedSession,
      localPreview
        ? 'Your local preview session is active in this browser.'
        : 'Your saved browser session is active while we reconnect to your account.',
    );
    if (restored) return;
  }

  if (!localPreview && isProtectedAccountPage()) {
    redirectToLogin();
    return;
  }

  if (isRegisterPage() && accountEmailInput) accountEmailInput.readOnly = false;
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
  if (isLoginPage() && loginError === 'wrong_password') {
    setLoginPasswordError('Wrong password. Please try again or use a one-time email code.');
    setLoginOtpMessage('Wrong password.', 'error');
    loginPasswordInput?.focus();
  }
  renderAccountProfile(null);
};

accountForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(accountForm);
  const profile = {
    email: String((isRegisterPage() ? formData.get('email') : accountIdentity?.email) || (isAccountLocalPreview() ? formData.get('email') : '') || '').trim().toLowerCase(),
    name: String(formData.get('name') || '').trim(),
    requestedRole: String(formData.get('requested_role') || 'customer'),
    companyName: String(formData.get('company_name') || '').trim(),
    companyWebsite: String(formData.get('company_website') || '').trim(),
    businessContext: String(formData.get('business_context') || '').trim(),
    notes: String(formData.get('notes') || '').trim(),
    phone: String(formData.get('phone') || '').trim(),
    preferredContact: String(formData.get('preferred_contact') || 'email').trim(),
    password: String(formData.get('password') || ''),
    passwordConfirm: String(formData.get('password_confirm') || ''),
    status: String(formData.get('requested_role') || 'customer') === 'customer' ? 'active' : 'pending_admin_grant',
    updatedAt: new Date().toISOString(),
  };

  const validationMessage = getRegisterValidationMessage(profile);
  if (validationMessage) {
    setAccountStatus({ heading: 'Check registration details', status: validationMessage, email: profile.email || accountIdentity?.email || 'Email pending', role: 'Registration', approved: false });
    return;
  }

  try {
    setAccountFormBusy(true);
    const verifiedEmail = String(accountIdentity?.email || '').trim().toLowerCase();
    const needsRegistrationOtp = isRegisterPage() && !isAccountLocalPreview() && verifiedEmail !== profile.email;
    if (needsRegistrationOtp) {
      const otp = String(formData.get('otp') || '').trim();
      if (!/^\d{6}$/.test(otp)) {
        setRegisterProgressStep('verify');
        setRegisterOtpMessage('Details saved on this page. Check your email for the 6-digit code, enter it here, then press Create Account again.', 'success');
        await requestLoginOtp(profile.email);
        if (registerOtpCodeWrap) registerOtpCodeWrap.hidden = false;
        if (registerOtpCodeInput) registerOtpCodeInput.required = true;
        registerOtpCodeInput?.focus();
        return;
      }

      setRegisterOtpMessage('Verifying your email and creating your account…');
      const account = await verifyLoginOtp(profile.email, otp, true);
      const identity = account.identity || { email: profile.email };
      accountIdentity = identity;
      saveAccountSession({ identity, profile: account.profile || null, grant: account.grant, role: account.role, remember: true });
    }

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
    setRegisterProgressStep('done');
    showRegisterCompleteState(savedProfile, remoteAccount);
    if (registerOtpCodeWrap) registerOtpCodeWrap.hidden = true;
    if (registerOtpCodeInput) registerOtpCodeInput.required = false;
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
  } finally {
    setAccountFormBusy(false);
  }
});



document.addEventListener('submit', async (event) => {
  const form = event.target.closest?.('[data-manager-request-note-form]');
  if (!form) return;
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  if (button) button.disabled = true;
  try {
    const formData = new FormData(form);
    const response = await fetch('/api/manager/inquiries', {
      method: 'PATCH',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        id: form.dataset.id || '',
        managerNote: formData.get('managerNote'),
        managerFollowUpAt: formData.get('managerFollowUpAt'),
        managerContactStatus: formData.get('managerContactStatus'),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Unable to save manager follow-up.');
    await loadRolePanelRequests('manager');
  } catch (error) {
    window.alert(error.message || 'Unable to save manager follow-up.');
  } finally {
    if (button) button.disabled = false;
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
    const availabilityError = ownerAvailabilityRangeError(formData);
    if (availabilityError) {
      window.alert(availabilityError);
      return;
    }
    const payload = payloadFromTextFields(formData);
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


document.addEventListener('submit', async (event) => {
  const form = event.target.closest?.('[data-customer-offer-response-form]');
  if (!form) return;
  event.preventDefault();
  const submitter = event.submitter;
  const action = submitter?.value || 'customer_interested';
  const button = submitter || form.querySelector('button[type="submit"]');
  if (button) button.disabled = true;
  try {
    const formData = new FormData(form);
    const response = await fetch('/api/customer-offers', {
      method: 'PATCH',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ id: form.dataset.id || '', action, message: formData.get('message') }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Unable to update this proposal.');
    await loadAccountActivity();
  } catch (error) {
    window.alert(error.message || 'Unable to update this proposal.');
  } finally {
    if (button) button.disabled = false;
  }
});

const setResetMessage = (message = '', tone = 'pending') => {
  if (!resetMessage) return;
  resetMessage.textContent = message;
  resetMessage.classList.toggle('status-approved', tone === 'success');
  resetMessage.classList.toggle('status-warning', tone === 'error');
  resetMessage.classList.toggle('status-pending', tone !== 'success' && tone !== 'error');
};


const showRegisterCompleteState = (profile = {}, remoteAccount = {}) => {
  if (!isRegisterPage() || !registerComplete) return;

  const requestedRole = String(profile.requestedRole || 'customer').toLowerCase();
  const role = normalizeAccountRole(remoteAccount.role || remoteAccount.grant?.role || profile.defaultRole || 'customer');
  const isPendingOwnerOrManager = ['owner', 'manager'].includes(requestedRole) && role === 'customer';

  registerComplete.hidden = false;
  if (registerCompleteHeading) {
    registerCompleteHeading.textContent = isPendingOwnerOrManager
      ? 'Registration received for review'
      : 'Your account is ready';
  }
  if (registerCompleteMessage) {
    registerCompleteMessage.textContent = isPendingOwnerOrManager
      ? `Your email is verified and your ${requestedRole} request is waiting for LuxeRoutes approval. You can use your account dashboard while the team reviews it.`
      : 'Your email is verified and your LuxeRoutes profile has been created.';
  }
  if (registerCompleteLink) {
    registerCompleteLink.href = isPendingOwnerOrManager ? 'account.html' : getRoleHomePath(role);
    registerCompleteLink.textContent = isPendingOwnerOrManager ? 'Open Account Dashboard' : 'Open Account';
  }
};

const setRegisterOtpMessage = (message = '', tone = 'pending') => {
  if (!registerOtpMessage) return;
  registerOtpMessage.textContent = message;
  registerOtpMessage.classList.toggle('status-approved', tone === 'success');
  registerOtpMessage.classList.toggle('status-warning', tone === 'error');
  registerOtpMessage.classList.toggle('status-pending', tone !== 'success' && tone !== 'error');
};

accountSettingsForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = getSettingsProfilePayload();
  if (!payload.name) {
    setInlineMessage(accountSettingsMessage, 'Full name is required before settings can be saved.', 'error');
    return;
  }

  try {
    if (accountSettingsSubmit) accountSettingsSubmit.disabled = true;
    setInlineMessage(accountSettingsMessage, 'Saving account settings…');
    const remoteAccount = await saveRemoteAccountProfile(payload);
    const savedProfile = remoteAccount.profile || payload;
    saveAccountProfile(savedProfile);
    saveAccountSession({ identity: accountIdentity || { email: savedProfile.email }, profile: savedProfile, grant: remoteAccount.grant, role: remoteAccount.role });
    renderAccountProfile(savedProfile, remoteAccount.grant);
    setInlineMessage(accountSettingsMessage, 'Account settings saved.', 'success');
  } catch (error) {
    setInlineMessage(accountSettingsMessage, error.message || 'Unable to save account settings right now.', 'error');
  } finally {
    if (accountSettingsSubmit) accountSettingsSubmit.disabled = false;
  }
});

accountPasswordForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(accountPasswordForm);
  const currentPassword = String(formData.get('current_password') || '');
  const newPassword = String(formData.get('new_password') || '');
  const newPasswordConfirm = String(formData.get('new_password_confirm') || '');

  if (newPassword.length < 8) {
    setInlineMessage(accountPasswordMessage, 'New password must be at least 8 characters.', 'error');
    return;
  }
  if (newPassword !== newPasswordConfirm) {
    setInlineMessage(accountPasswordMessage, 'New password confirmation does not match.', 'error');
    return;
  }
  if (passwordScore(newPassword) < 3) {
    setInlineMessage(accountPasswordMessage, 'Use a stronger password with at least three of: 12+ characters, uppercase, lowercase, number, symbol.', 'error');
    return;
  }

  try {
    if (accountPasswordSubmit) accountPasswordSubmit.disabled = true;
    setInlineMessage(accountPasswordMessage, 'Updating password…');
    await changeAccountPassword(currentPassword, newPassword, newPasswordConfirm);
    accountPasswordForm.reset();
    setInlineMessage(accountPasswordMessage, 'Password updated. You can keep logging in with password or OTP.', 'success');
  } catch (error) {
    setInlineMessage(accountPasswordMessage, error.message || 'Unable to update your password right now.', 'error');
  } finally {
    if (accountPasswordSubmit) accountPasswordSubmit.disabled = false;
  }
});

forgotPasswordToggle?.addEventListener('click', () => {
  if (loginActions) loginActions.hidden = true;
  if (passwordResetForm) passwordResetForm.hidden = false;
  resetEmailInput.value = loginEmailInput?.value || '';
  resetEmailInput?.focus();
});

resetCancel?.addEventListener('click', (event) => {
  if (!isPasswordResetPage()) {
    event.preventDefault();
    if (passwordResetForm) passwordResetForm.hidden = true;
    if (loginActions) loginActions.hidden = false;
    setResetMessage('Password reset uses the same Resend OTP email verification.');
  }
});

const syncResetPasswordLink = () => {
  if (!forgotPasswordLink) return;
  const email = String(loginEmailInput?.value || '').trim();
  forgotPasswordLink.href = email ? `reset-password.html?email=${encodeURIComponent(email)}` : 'reset-password.html';
};

loginEmailInput?.addEventListener('input', () => {
  syncResetPasswordLink();
  setLoginPasswordError('');
});
syncResetPasswordLink();

if (isPasswordResetPage() && resetEmailInput) {
  const resetEmail = new URLSearchParams(window.location.search).get('email') || '';
  resetEmailInput.value = resetEmail;
  (resetEmail ? resetSubmit : resetEmailInput)?.focus();
}

loginPasswordInput?.addEventListener('input', () => setLoginPasswordError(''));

passwordResetForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = String(resetEmailInput?.value || '').trim().toLowerCase();
  const otp = String(resetCodeInput?.value || '').trim();
  const password = String(resetPasswordInput?.value || '');
  const passwordConfirm = String(resetPasswordConfirmInput?.value || '');
  const hasCode = /^\d{6}$/.test(otp);

  if (!email || !email.includes('@')) {
    setResetMessage('Enter a valid account email.', 'error');
    return;
  }

  try {
    resetSubmit.disabled = true;
    if (!hasCode) {
      setResetMessage('Sending password reset code…');
      await requestPasswordReset(email);
      setResetMessage('Check your email for the 6-digit reset code, then enter it with your new password.', 'success');
      resetSubmit.textContent = 'Reset password';
      resetCodeInput.required = true;
      resetPasswordInput.required = true;
      if (resetPasswordConfirmInput) resetPasswordConfirmInput.required = true;
      resetCodeInput?.focus();
      return;
    }

    if (password.length < 8) {
      setResetMessage('Enter a new password with at least 8 characters.', 'error');
      return;
    }
    if (password !== passwordConfirm) {
      setResetMessage('New password confirmation does not match.', 'error');
      return;
    }
    if (passwordScore(password) < 3) {
      setResetMessage('Use a stronger password with at least three of: 12+ characters, uppercase, lowercase, number, symbol.', 'error');
      return;
    }

    setResetMessage('Updating your password…');
    await confirmPasswordReset(email, otp, password);
    setResetMessage('Password updated. You can now sign in with your new password.', 'success');
    if (loginEmailInput) loginEmailInput.value = email;
    if (loginPasswordInput) loginPasswordInput.value = '';
    if (isLoginPage()) {
      if (passwordResetForm) passwordResetForm.hidden = true;
      if (loginActions) loginActions.hidden = false;
    } else if (resetSubmit) {
      resetSubmit.textContent = 'Send another reset code';
    }
  } catch (error) {
    setResetMessage(error.message || 'Unable to reset your password right now.', 'error');
  } finally {
    resetSubmit.disabled = false;
  }
});

document.querySelectorAll('[data-password-toggle]').forEach((button) => button.addEventListener('click', () => {
  const input = button.closest('.password-field')?.querySelector('input');
  if (!input) return;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  button.textContent = show ? 'Hide' : 'Show';
  button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
}));

registerPasswordInput?.addEventListener('input', updatePasswordStrength);
registerPasswordConfirm?.addEventListener('input', updatePasswordStrength);
updatePasswordStrength();
accountNewPasswordInput?.addEventListener('input', updateAccountPasswordStrength);
accountNewPasswordConfirmInput?.addEventListener('input', updateAccountPasswordStrength);
updateAccountPasswordStrength();
resetPasswordInput?.addEventListener('input', updateResetPasswordStrength);
resetPasswordConfirmInput?.addEventListener('input', updateResetPasswordStrength);
updateResetPasswordStrength();

loginOtpBack?.addEventListener('click', () => {
  showLoginEmailStep();
  setLoginOtpMessage('Enter your email and we will send a fresh 6-digit login code.');
});

loginResendCode?.addEventListener('click', async () => {
  const email = String(loginEmailInput?.value || '').trim().toLowerCase();
  if (!email || !email.includes('@')) return setLoginOtpMessage('Enter a valid email before requesting a new code.', 'error');
  try {
    setLoginOtpMessage('Sending a fresh code…');
    await requestLoginOtp(email);
    setLoginOtpMessage('Fresh code sent. Check your email.', 'success');
    setResendCooldown();
  } catch (error) {
    setLoginOtpMessage(error.message || 'Unable to resend code right now.', 'error');
  }
});

loginMagicLink?.addEventListener('click', async () => {
  const email = String(loginEmailInput?.value || '').trim().toLowerCase();
  if (!email || !email.includes('@')) return setLoginOtpMessage('Enter a valid email before requesting a magic link.', 'error');
  try {
    setLoginOtpMessage('Sending your magic link…');
    await requestMagicLink(email);
    setLoginOtpMessage('Magic link sent. Open it on this device to continue.', 'success');
  } catch (error) {
    setLoginOtpMessage(error.message || 'Unable to send magic link right now.', 'error');
  }
});

accountEmailForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = String(changeEmailInput?.value || '').trim().toLowerCase();
  const otp = String(changeEmailCode?.value || '').trim();
  if (!email || !email.includes('@')) return setInlineMessage(changeEmailMessage, 'Enter a valid new email.', 'error');
  try {
    changeEmailSubmit.disabled = true;
    if (!/^\d{6}$/.test(otp)) {
      setInlineMessage(changeEmailMessage, 'Sending verification code to your new email…');
      await requestEmailChangeCode(email);
      setInlineMessage(changeEmailMessage, 'Code sent. Enter the 6-digit code and submit again.', 'success');
      changeEmailCode.required = true;
      changeEmailSubmit.textContent = 'Verify and change email';
      changeEmailCode?.focus();
      return;
    }
    const account = await confirmEmailChange(email, otp);
    setInlineMessage(changeEmailMessage, 'Email updated. Refreshing account…', 'success');
    saveAccountSession({ identity: account.identity || { email }, profile: account.profile, grant: account.grant, role: account.role, remember: true });
    window.location.reload();
  } catch (error) {
    setInlineMessage(changeEmailMessage, error.message || 'Unable to change email right now.', 'error');
  } finally {
    changeEmailSubmit.disabled = false;
  }
});

managerRequestFilter?.addEventListener('change', () => {
  renderRoleRequests(managerRequestsTarget, roleRequestCache.manager, 'No customer stay requests are connected to your assigned properties yet.', 'manager');
});

if (securityActivity) {
  const session = loadAccountSession();
  securityActivity.innerHTML = `<div class="stack-item"><div><strong>Login activity</strong><span>Session: ${session?.remember ? 'remembered device' : 'standard'} · Expires: ${session?.expiresAt ? new Date(session.expiresAt).toLocaleString() : 'server cookie'}</span></div><span class="status-pill">Secure</span></div>`;
}

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
    setLoginPasswordError('');
    setLoginOtpBusy(true);
    if (!isCodeStep) {
      setLoginPasswordError('');
      const password = String(loginPasswordInput?.value || '');
      const submittedWithOtpButton = Boolean(event.submitter?.matches('[data-login-otp-submit]'));
      const usePassword = Boolean(event.submitter?.matches('[data-login-password-submit]')) || (Boolean(password) && !submittedWithOtpButton);
      const remember = Boolean(loginRememberInput?.checked);

      if (usePassword) {
        if (!password) {
          setLoginOtpMessage('Enter your password, or request a one-time email code instead.', 'error');
          return;
        }

        setLoginOtpMessage('Signing in with your password…');
        const account = await loginWithPassword(email, password, remember);
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
        return;
      }

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
    const message = error.message || 'Unable to complete login right now.';
    if (isWrongPasswordError(message)) {
      setLoginPasswordError('Wrong password. Please try again or use a one-time email code.');
      loginPasswordInput?.focus();
      loginPasswordInput?.select?.();
    }
    setLoginOtpMessage(message, 'error');
  } finally {
    setLoginOtpBusy(false);
  }
});

accountLogoutButtons.forEach((button) => button.addEventListener('click', logoutAccount));

updateAccountAccessCards();
updateAccountLogout(false);
initialiseAccount();
