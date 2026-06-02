const accountStatus = document.querySelector('[data-account-status]');
const accountHeading = document.querySelector('[data-account-heading]');
const accountEmail = document.querySelector('[data-account-email]');
const accountRole = document.querySelector('[data-account-role]');
const accountForm = document.querySelector('[data-account-form]');
const accountEmailInput = document.querySelector('[data-account-email-input]');
const accountProfile = document.querySelector('[data-account-profile]');
const accountLoginLink = document.querySelector('[data-account-login-link]');
const accountStorageKey = 'luxeroutes-account-profile-v1';
let accountIdentity = null;
let accountApiEnabled = false;

const accountEscapeHtml = (value) => String(value || '').replace(/[&<>"]/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
}[character]));

const isAccountLocalPreview = () => ['localhost', '127.0.0.1', ''].includes(window.location.hostname);

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

const renderAccountProfile = (profile, grant = null) => {
  if (!accountProfile) return;

  if (!profile) {
    accountProfile.innerHTML = '<p class="empty-state">No local profile saved yet.</p>';
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
  if (accountLoginLink) {
    if (accountForm) {
      accountLoginLink.textContent = 'Continue Registration';
      accountLoginLink.href = '#account-workspace';
    } else {
      accountLoginLink.textContent = email && approved ? 'Manage Account' : 'Login with Email';
      accountLoginLink.href = email && approved ? '#account-workspace' : 'account.html';
    }
  }
};

const initialiseAccount = async () => {
  const identity = await getAccessIdentity();
  accountIdentity = identity;
  const remoteAccount = identity ? await loadRemoteAccountProfile() : null;
  const profile = remoteAccount?.profile || loadAccountProfile();

  if (identity) {
    setAccountStatus({
      heading: 'Email verified',
      status: remoteAccount?.profile
        ? 'Cloudflare Access verified your email and loaded your profile from Cloudflare D1.'
        : 'Cloudflare Access verified your email. Register as a customer, then an admin can grant owner or manager access by this email.',
      email: identity.email,
      role: remoteAccount?.role ? accountEscapeHtml(remoteAccount.role) : 'Customer login',
      approved: true,
    });
  } else if (isAccountLocalPreview()) {
    setAccountStatus({
      heading: 'Local preview',
      status: 'Local preview is active. In production, protect this page with a Cloudflare Access policy that allows everyone to login by email.',
      email: profile?.email || 'localhost preview',
      role: 'Preview',
      approved: true,
    });
  } else {
    setAccountStatus({
      heading: 'Login required',
      status: 'This page should be protected by Cloudflare Access with an Everyone policy, so customers login with email before registering.',
      email: 'Cloudflare Access required',
      role: 'Not verified',
      approved: false,
    });
  }

  renderAccountProfile(profile, remoteAccount?.grant);
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

initialiseAccount();
