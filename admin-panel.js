const adminApp = document.querySelector('[data-admin-app]');
const authStatus = document.querySelector('[data-auth-status]');
const authEmail = document.querySelector('[data-auth-email]');
const authRole = document.querySelector('[data-auth-role]');
const alertBox = document.querySelector('[data-admin-alert]');
const refreshButton = document.querySelector('[data-refresh-admin]');
const statsTarget = document.querySelector('[data-admin-stats]');
const applicationsTarget = document.querySelector('[data-applications]');
const membersTarget = document.querySelector('[data-members]');
const inquiriesTarget = document.querySelector('[data-inquiries]');
const grantForm = document.querySelector('[data-grant-form]');
const inquiryDialog = document.querySelector('[data-inquiry-dialog]');
const inquiryDialogTitle = document.querySelector('[data-inquiry-dialog-title]');
const inquiryDialogContent = document.querySelector('[data-inquiry-dialog-content]');

let currentAdminEmail = '';
let profiles = [];
let grants = [];
let inquiries = [];

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
}[character]));

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

const roleLabel = (role) => ({ customer: 'Customer', owner: 'Owner', manager: 'Manager', admin: 'Admin' }[role] || role || 'Customer');
const statusLabel = (status) => String(status || 'unknown').replaceAll('_', ' ');
const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const safeExternalUrl = (value) => {
  try {
    const url = new URL(String(value || ''));
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch (error) {
    return '';
  }
};

const showAlert = (message = '', kind = 'error') => {
  if (!alertBox) return;
  alertBox.hidden = !message;
  alertBox.textContent = message;
  alertBox.dataset.kind = kind;
};

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed with HTTP ${response.status}.`);
  return data;
};

const renderStats = () => {
  const pending = profiles.filter((profile) => profile.status === 'pending_admin_grant').length;
  const activeMembers = grants.filter((grant) => grant.status === 'active').length;
  const openInquiries = inquiries.filter((inquiry) => !['resolved', 'closed'].includes(inquiry.status)).length;
  const admins = grants.filter((grant) => grant.status === 'active' && grant.role === 'admin').length;
  statsTarget.innerHTML = [
    ['Pending applications', pending],
    ['Active members', activeMembers],
    ['Open inquiries', openInquiries],
    ['Active admins', admins],
  ].map(([label, value]) => `<article><strong>${value}</strong><span>${label}</span></article>`).join('');
};

const renderApplications = () => {
  const pending = profiles.filter((profile) => profile.status === 'pending_admin_grant');
  applicationsTarget.innerHTML = pending.map((profile) => {
    const website = safeExternalUrl(profile.companyWebsite);
    return `
    <article class="admin-record">
      <div>
        <span class="status-pill status-warning">${escapeHtml(roleLabel(profile.requestedRole))} request</span>
        <h3>${escapeHtml(profile.name || profile.email)}</h3>
        <p><strong>${escapeHtml(profile.email)}</strong>${profile.companyName ? ` · ${escapeHtml(profile.companyName)}` : ''}</p>
        ${website ? `<p><a href="${escapeHtml(website)}" target="_blank" rel="noopener noreferrer">${escapeHtml(website)}</a></p>` : ''}
        ${profile.businessContext ? `<p>${escapeHtml(profile.businessContext)}</p>` : ''}
        <small>Submitted ${escapeHtml(formatDate(profile.updatedAt))}</small>
      </div>
      <div class="admin-record-actions">
        <button class="btn btn-primary" type="button" data-grant-action="approve" data-email="${escapeHtml(profile.email)}" data-role="${escapeHtml(profile.requestedRole)}">Approve</button>
        <button class="btn btn-secondary" type="button" data-grant-action="reject" data-email="${escapeHtml(profile.email)}" data-role="customer">Reject</button>
      </div>
    </article>
  `;
  }).join('') || '<p class="empty-state">No owner or manager applications are waiting for review.</p>';
};

const renderMembers = () => {
  const profileByEmail = new Map(profiles.map((profile) => [profile.email, profile]));
  membersTarget.innerHTML = grants.map((grant) => {
    const profile = profileByEmail.get(grant.email) || {};
    const isSelf = normalizeEmail(grant.email) === normalizeEmail(currentAdminEmail);
    return `
      <tr>
        <td><strong>${escapeHtml(profile.name || grant.email)}</strong><br><small>${escapeHtml(grant.email)}</small></td>
        <td>${escapeHtml(roleLabel(grant.role))}</td>
        <td>${escapeHtml(statusLabel(grant.status))}</td>
        <td>${escapeHtml(profile.companyName || '—')}</td>
        <td>${escapeHtml(formatDate(grant.updatedAt))}</td>
        <td>
          <form class="inline-role-form" data-member-form data-email="${escapeHtml(grant.email)}">
            <select name="role" aria-label="Role for ${escapeHtml(grant.email)}" ${isSelf ? 'disabled' : ''}>
              ${['customer', 'owner', 'manager', 'admin'].map((role) => `<option value="${role}" ${grant.role === role ? 'selected' : ''}>${roleLabel(role)}</option>`).join('')}
            </select>
            <button class="mini-action" type="submit" ${isSelf ? 'disabled' : ''}>Save</button>
          </form>
        </td>
      </tr>`;
  }).join('') || '<tr><td colspan="6" class="empty-state">No member grants found.</td></tr>';
};

const renderInquiries = () => {
  inquiriesTarget.innerHTML = inquiries.map((inquiry) => `
    <tr>
      <td><strong>${escapeHtml(inquiry.name || 'Unnamed')}</strong><br><small>${escapeHtml(inquiry.email || inquiry.phone || 'No contact')}</small></td>
      <td>${escapeHtml(inquiry.inquiryType)}</td>
      <td>${escapeHtml(formatDate(inquiry.createdAt))}</td>
      <td>
        <select data-inquiry-status data-id="${escapeHtml(inquiry.id)}" aria-label="Status for ${escapeHtml(inquiry.inquiryType)}">
          ${['new', 'in_progress', 'waiting', 'resolved', 'closed'].map((status) => `<option value="${status}" ${inquiry.status === status ? 'selected' : ''}>${statusLabel(status)}</option>`).join('')}
        </select>
      </td>
      <td><button class="mini-action" type="button" data-inquiry-detail="${escapeHtml(inquiry.id)}">View details</button></td>
    </tr>
  `).join('') || '<tr><td colspan="5" class="empty-state">No inquiries received yet.</td></tr>';
};

const renderAll = () => {
  renderStats();
  renderApplications();
  renderMembers();
  renderInquiries();
};

const loadAdminData = async () => {
  showAlert('');
  refreshButton.disabled = true;
  try {
    const [grantData, inquiryData] = await Promise.all([
      requestJson('/api/admin/grants'),
      requestJson('/api/admin/inquiries'),
    ]);
    profiles = Array.isArray(grantData.profiles) ? grantData.profiles : [];
    grants = Array.isArray(grantData.grants) ? grantData.grants : [];
    inquiries = Array.isArray(inquiryData.inquiries) ? inquiryData.inquiries : [];
    renderAll();
  } catch (error) {
    showAlert(error.message);
  } finally {
    refreshButton.disabled = false;
  }
};

const verifyAdmin = async () => {
  try {
    const session = await requestJson('/api/admin/session');
    currentAdminEmail = session.email;
    authStatus.textContent = 'Verified by Cloudflare Access and the D1 admin grant.';
    authEmail.textContent = session.email;
    authRole.textContent = 'Admin';
    authRole.className = 'status-pill status-approved';
    adminApp.hidden = false;
    await loadAdminData();
  } catch (error) {
    authStatus.textContent = error.message;
    authEmail.textContent = 'No verified admin session';
    authRole.textContent = 'Locked';
    authRole.className = 'status-pill status-warning';
    adminApp.hidden = true;
  }
};

const saveGrant = async ({ email, role, action = 'approve', note = '' }) => {
  await requestJson('/api/admin/grants', {
    method: 'POST',
    body: JSON.stringify({ email, role, action, note }),
  });
  showAlert(`${email} was updated successfully.`, 'success');
  await loadAdminData();
};

document.addEventListener('click', async (event) => {
  const grantButton = event.target.closest('[data-grant-action]');
  if (grantButton) {
    grantButton.disabled = true;
    try {
      await saveGrant({ email: grantButton.dataset.email, role: grantButton.dataset.role, action: grantButton.dataset.grantAction });
    } catch (error) {
      showAlert(error.message);
      grantButton.disabled = false;
    }
    return;
  }

  const detailButton = event.target.closest('[data-inquiry-detail]');
  if (detailButton) {
    const inquiry = inquiries.find((item) => item.id === detailButton.dataset.inquiryDetail);
    if (!inquiry) return;
    let payload = {};
    try { payload = JSON.parse(inquiry.payloadJson || '{}'); } catch (error) { payload = {}; }
    inquiryDialogTitle.textContent = inquiry.inquiryType || 'Inquiry';
    const details = { name: inquiry.name, email: inquiry.email, phone: inquiry.phone, received: formatDate(inquiry.createdAt), ...payload };
    inquiryDialogContent.innerHTML = Object.entries(details)
      .filter(([, value]) => value)
      .map(([key, value]) => `<div><dt>${escapeHtml(key.replaceAll('_', ' '))}</dt><dd>${escapeHtml(value)}</dd></div>`)
      .join('') || '<p>No additional details.</p>';
    inquiryDialog.showModal();
  }
});

document.addEventListener('submit', async (event) => {
  const memberForm = event.target.closest('[data-member-form]');
  if (memberForm) {
    event.preventDefault();
    try {
      await saveGrant({ email: memberForm.dataset.email, role: new FormData(memberForm).get('role'), note: 'Role updated from admin console' });
    } catch (error) { showAlert(error.message); }
    return;
  }

  if (event.target === grantForm) {
    event.preventDefault();
    const data = new FormData(grantForm);
    try {
      await saveGrant({ email: data.get('email'), role: data.get('role'), note: data.get('note') });
      grantForm.reset();
    } catch (error) { showAlert(error.message); }
  }
});

document.addEventListener('change', async (event) => {
  const select = event.target.closest('[data-inquiry-status]');
  if (!select) return;
  select.disabled = true;
  try {
    await requestJson('/api/admin/inquiries', { method: 'PATCH', body: JSON.stringify({ id: select.dataset.id, status: select.value }) });
    showAlert('Inquiry status updated.', 'success');
    await loadAdminData();
  } catch (error) {
    showAlert(error.message);
    select.disabled = false;
  }
});

refreshButton?.addEventListener('click', loadAdminData);
verifyAdmin();
