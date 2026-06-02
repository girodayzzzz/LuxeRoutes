const adminApp = document.querySelector('[data-admin-app]');
const roleSelect = document.querySelector('[data-role-select]');
const storageKey = 'luxeroutes-admin-panel-v1';

const seedData = {
  properties: [
    {
      id: 'prop-ble-lake',
      title: 'Lake View Apartment Bled',
      owner: 'Alpine Private Stays',
      country: 'Slovenia',
      region: 'Lakes',
      type: 'Apartment',
      manager: 'Maja Novak',
      status: 'pending_review',
      notes: 'Two-bedroom lake apartment with parking, chef partner option, and premium arrival flow.',
    },
    {
      id: 'prop-adriatic-villa',
      title: 'Adriatic Stone Villa',
      owner: 'Dalmatia Estate Partners',
      country: 'Croatia',
      region: 'Adriatic',
      type: 'Villa',
      manager: 'Luka Marin',
      status: 'published',
      notes: 'Private pool, sea view, concierge-ready villa for coastal routes.',
    },
    {
      id: 'prop-dolomites-chalet',
      title: 'Dolomites Hideaway Chalet',
      owner: 'Northern Peaks Collection',
      country: 'Italy',
      region: 'Alps',
      type: 'Chalet',
      manager: 'Elena Rossi',
      status: 'draft',
      notes: 'Needs winter transfer details and exact cancellation terms before review.',
    },
  ],
  owners: [
    { name: 'Alpine Private Stays', email: 'owners@alpinestays.example', status: 'Verification pending', region: 'Slovenia · Lakes' },
    { name: 'Dalmatia Estate Partners', email: 'partners@dalmatia.example', status: 'Approved partner', region: 'Croatia · Adriatic' },
    { name: 'Northern Peaks Collection', email: 'hello@northernpeaks.example', status: 'Draft onboarding', region: 'Italy · Alps' },
  ],
  managers: [
    { name: 'Maja Novak', email: 'maja@example.com', region: 'Slovenia', status: 'Active' },
    { name: 'Luka Marin', email: 'luka@example.com', region: 'Croatia', status: 'Active' },
    { name: 'Elena Rossi', email: 'elena@example.com', region: 'Italy', status: 'Candidate' },
  ],
  inquiries: [
    { id: 'inq-001', guest: 'Sophia Keller', interest: 'Lake View Apartment Bled', dates: '14–18 Aug', status: 'new', next: 'Confirm availability with owner' },
    { id: 'inq-002', guest: 'Marco Laurent', interest: 'Adriatic Stone Villa', dates: 'Flexible September', status: 'proposal_sent', next: 'Follow up on proposed route' },
    { id: 'inq-003', guest: 'Amelia Grant', interest: 'Dolomites chalet ideas', dates: 'Winter holiday', status: 'researching', next: 'Wait for manager notes' },
  ],
};

const statusLabels = {
  draft: 'Draft',
  pending_review: 'Pending review',
  needs_changes: 'Needs changes',
  approved: 'Approved',
  published: 'Published',
  archived: 'Archived',
};

const inquiryStatusLabels = {
  new: 'New',
  researching: 'Researching',
  proposal_sent: 'Proposal sent',
  won: 'Won',
  lost: 'Lost',
};

const cloneData = (data) => JSON.parse(JSON.stringify(data));

let state = cloneData(seedData);

const saveState = () => {
  localStorage.setItem(storageKey, JSON.stringify(state));
};

const loadState = () => {
  const stored = localStorage.getItem(storageKey);
  if (!stored) {
    saveState();
    return;
  }

  const parsed = JSON.parse(stored);
  state = {
    properties: Array.isArray(parsed.properties) ? parsed.properties : cloneData(seedData.properties),
    owners: Array.isArray(parsed.owners) ? parsed.owners : cloneData(seedData.owners),
    managers: Array.isArray(parsed.managers) ? parsed.managers : cloneData(seedData.managers),
    inquiries: Array.isArray(parsed.inquiries) ? parsed.inquiries : cloneData(seedData.inquiries),
  };
};

const escapeHtml = (value) => String(value || '').replace(/[&<>"]/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
}[character]));

const formatStatus = (status) => statusLabels[status] || inquiryStatusLabels[status] || status;

const statusClass = (status) => {
  if (status === 'published' || status === 'approved' || status === 'won') return 'status-approved';
  if (status === 'pending_review' || status === 'new' || status === 'researching') return 'status-pending';
  if (status === 'needs_changes' || status === 'lost') return 'status-warning';
  return '';
};

const canApprove = () => roleSelect?.value === 'admin';
const canReview = () => roleSelect?.value === 'admin' || roleSelect?.value === 'manager';

const nextPropertyStatus = (status) => {
  if (status === 'draft') return 'pending_review';
  if (status === 'pending_review') return canApprove() ? 'approved' : 'needs_changes';
  if (status === 'needs_changes') return 'pending_review';
  if (status === 'approved') return canApprove() ? 'published' : 'approved';
  if (status === 'published') return canApprove() ? 'archived' : 'published';
  return 'draft';
};

const propertyActionLabel = (status) => {
  if (status === 'draft') return 'Submit';
  if (status === 'pending_review') return canApprove() ? 'Approve' : 'Request changes';
  if (status === 'needs_changes') return 'Resubmit';
  if (status === 'approved') return canApprove() ? 'Publish' : 'Approved';
  if (status === 'published') return canApprove() ? 'Archive' : 'Published';
  return 'Reopen';
};

const nextInquiryStatus = (status) => {
  if (status === 'new') return 'researching';
  if (status === 'researching') return 'proposal_sent';
  if (status === 'proposal_sent') return 'won';
  if (status === 'won') return 'new';
  return 'new';
};

const renderStats = () => {
  const statTargets = {
    properties: state.properties.length,
    pending: state.properties.filter((property) => property.status === 'pending_review').length,
    published: state.properties.filter((property) => property.status === 'published').length,
    inquiries: state.inquiries.filter((inquiry) => !['won', 'lost'].includes(inquiry.status)).length,
  };

  Object.entries(statTargets).forEach(([key, value]) => {
    const target = document.querySelector(`[data-stat="${key}"]`);
    if (target) target.textContent = String(value);
  });
};

const renderReviewList = () => {
  const target = document.querySelector('[data-review-list]');
  if (!target) return;

  const reviewItems = state.properties.filter((property) => ['pending_review', 'needs_changes', 'approved'].includes(property.status));
  if (!reviewItems.length) {
    target.innerHTML = '<p class="empty-state">No listings need review right now.</p>';
    return;
  }

  target.innerHTML = reviewItems.map((property) => `
    <div class="stack-item">
      <div>
        <strong>${escapeHtml(property.title)}</strong>
        <span>${escapeHtml(property.country)} · ${escapeHtml(property.region)} · ${escapeHtml(property.type)}</span>
      </div>
      <span class="status-pill ${statusClass(property.status)}">${formatStatus(property.status)}</span>
    </div>
  `).join('');
};

const renderPropertyTable = () => {
  const table = document.querySelector('[data-property-table]');
  if (!table) return;

  table.innerHTML = state.properties.map((property) => `
    <tr>
      <td><strong>${escapeHtml(property.title)}</strong><small>${escapeHtml(property.notes)}</small></td>
      <td>${escapeHtml(property.owner)}</td>
      <td>${escapeHtml(property.country)}<small>${escapeHtml(property.region)}</small></td>
      <td>${escapeHtml(property.type)}</td>
      <td><span class="status-pill ${statusClass(property.status)}">${formatStatus(property.status)}</span></td>
      <td><button class="mini-action" type="button" data-property-action="${property.id}" ${!canReview() ? 'disabled' : ''}>${propertyActionLabel(property.status)}</button></td>
    </tr>
  `).join('');
};

const renderPeople = () => {
  const ownerList = document.querySelector('[data-owner-list]');
  const managerList = document.querySelector('[data-manager-list]');

  if (ownerList) {
    ownerList.innerHTML = state.owners.map((owner) => `
      <div class="stack-item">
        <div><strong>${escapeHtml(owner.name)}</strong><span>${escapeHtml(owner.email)} · ${escapeHtml(owner.region)}</span></div>
        <span class="status-pill">${escapeHtml(owner.status)}</span>
      </div>
    `).join('');
  }

  if (managerList) {
    managerList.innerHTML = state.managers.map((manager) => `
      <div class="stack-item">
        <div><strong>${escapeHtml(manager.name)}</strong><span>${escapeHtml(manager.email)} · ${escapeHtml(manager.region)}</span></div>
        <span class="status-pill ${manager.status === 'Active' ? 'status-approved' : 'status-pending'}">${escapeHtml(manager.status)}</span>
      </div>
    `).join('');
  }
};

const renderInquiryTable = () => {
  const table = document.querySelector('[data-inquiry-table]');
  if (!table) return;

  table.innerHTML = state.inquiries.map((inquiry) => `
    <tr>
      <td><strong>${escapeHtml(inquiry.guest)}</strong></td>
      <td>${escapeHtml(inquiry.interest)}</td>
      <td>${escapeHtml(inquiry.dates)}</td>
      <td><span class="status-pill ${statusClass(inquiry.status)}">${formatStatus(inquiry.status)}</span></td>
      <td>${escapeHtml(inquiry.next)}</td>
      <td><button class="mini-action" type="button" data-inquiry-action="${inquiry.id}" ${roleSelect?.value === 'owner' ? 'disabled' : ''}>Advance</button></td>
    </tr>
  `).join('');
};

const renderRoleAccess = () => {
  const role = roleSelect?.value || 'admin';
  document.body.dataset.panelRole = role;
  document.querySelectorAll('[data-admin-tab]').forEach((button) => {
    const tab = button.dataset.adminTab;
    const restrictedForOwner = role === 'owner' && ['people', 'settings'].includes(tab);
    button.disabled = restrictedForOwner;
  });
};

const render = () => {
  renderRoleAccess();
  renderStats();
  renderReviewList();
  renderPropertyTable();
  renderPeople();
  renderInquiryTable();
};

if (adminApp) {
  loadState();
  render();

  document.querySelectorAll('[data-admin-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.disabled) return;
      document.querySelectorAll('[data-admin-tab]').forEach((tab) => {
        const isActive = tab === button;
        tab.classList.toggle('is-active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
      });
      document.querySelectorAll('[data-panel]').forEach((panel) => {
        panel.classList.toggle('is-active', panel.dataset.panel === button.dataset.adminTab);
      });
    });
  });

  roleSelect?.addEventListener('change', render);

  document.querySelector('[data-property-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get('title') || '').trim();
    const owner = String(formData.get('owner') || '').trim();
    if (!title || !owner) return;

    state.properties.unshift({
      id: `prop-${Date.now()}`,
      title,
      owner,
      country: String(formData.get('country') || '').trim(),
      region: String(formData.get('region') || '').trim(),
      type: String(formData.get('type') || '').trim(),
      manager: String(formData.get('manager') || '').trim() || 'Unassigned',
      status: 'draft',
      notes: String(formData.get('notes') || '').trim() || 'New draft listing. Add review notes before publishing.',
    });

    if (!state.owners.some((existingOwner) => existingOwner.name.toLowerCase() === owner.toLowerCase())) {
      state.owners.unshift({
        name: owner,
        email: 'Owner email pending',
        status: 'Draft onboarding',
        region: `${String(formData.get('country') || '').trim()} · ${String(formData.get('region') || '').trim()}`,
      });
    }

    saveState();
    form.reset();
    render();
  });

  adminApp.addEventListener('click', (event) => {
    const propertyButton = event.target.closest('[data-property-action]');
    if (propertyButton) {
      const property = state.properties.find((item) => item.id === propertyButton.dataset.propertyAction);
      if (property && canReview()) {
        property.status = nextPropertyStatus(property.status);
        saveState();
        render();
      }
    }

    const inquiryButton = event.target.closest('[data-inquiry-action]');
    if (inquiryButton && roleSelect?.value !== 'owner') {
      const inquiry = state.inquiries.find((item) => item.id === inquiryButton.dataset.inquiryAction);
      if (inquiry) {
        inquiry.status = nextInquiryStatus(inquiry.status);
        inquiry.next = inquiry.status === 'won' ? 'Confirm commission and owner handoff' : 'Update partner and guest notes';
        saveState();
        render();
      }
    }
  });

  document.querySelector('[data-reset-demo]')?.addEventListener('click', () => {
    state = cloneData(seedData);
    saveState();
    render();
  });
}
