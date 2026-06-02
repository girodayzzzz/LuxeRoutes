const adminApp = document.querySelector('[data-admin-app]');
const roleSelect = document.querySelector('[data-role-select]');
const rolePreview = document.querySelector('[data-role-preview]');
const authStatus = document.querySelector('[data-auth-status]');
const authEmail = document.querySelector('[data-auth-email]');
const authRole = document.querySelector('[data-auth-role]');
const storageKey = 'luxeroutes-admin-panel-v1';
const accountProfileStorageKey = 'luxeroutes-account-profile-v1';
const offerBuilderForm = document.querySelector('[data-offer-builder-form]');
const markdownOutput = document.querySelector('[data-markdown-output]');
const offerPreview = document.querySelector('[data-offer-preview]');
const offerPathTarget = document.querySelector('[data-offer-path]');

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
  accessGrants: [
    { email: 'traveler@example.com', role: 'customer', note: 'Default public account role', status: 'Active' },
    { email: 'partners@dalmatia.example', role: 'owner', note: 'Owner access for Adriatic Stone Villa', status: 'Active' },
    { email: 'maja@example.com', role: 'manager', note: 'Manager access for Slovenia listings', status: 'Active' },
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

const taxonomyLabels = {
  countries: {
    slovenia: 'Slovenia',
    croatia: 'Croatia',
    italy: 'Italy',
    austria: 'Austria',
    switzerland: 'Switzerland',
    france: 'France',
  },
  regions: {
    alps: 'Alps',
    adriatic: 'Adriatic coast',
    lakes: 'Lakes',
    'wine-country': 'Wine country',
    city: 'City',
    countryside: 'Countryside',
    riviera: 'Riviera',
  },
  accommodationTypes: {
    villa: 'Private villa',
    chalet: 'Chalet',
    'boutique-hotel': 'Boutique hotel',
    apartment: 'Apartment',
    cabin: 'Cabin',
    retreat: 'Wellness retreat',
  },
  tripTypes: {
    'signature-route': 'Signature route',
    'romantic-getaway': 'Romantic getaway',
    'wine-tour': 'Wine tour',
    'wellness-retreat': 'Wellness retreat',
    'yacht-experience': 'Yacht experience',
    'fishing-escape': 'Fishing escape',
  },
};

const accommodationFolders = {
  villa: 'villas',
  chalet: 'chalets',
  'boutique-hotel': 'boutique-hotels',
  apartment: 'apartments',
  cabin: 'cabins',
  retreat: 'wellness-retreats',
};

const tripFolders = {
  'signature-route': 'signature-routes',
  'romantic-getaway': 'romantic-getaways',
  'wine-tour': 'wine-tours',
  'wellness-retreat': 'wellness-retreats',
  'yacht-experience': 'yacht-experiences',
  'fishing-escape': 'fishing-escapes',
};

const cloneData = (data) => JSON.parse(JSON.stringify(data));

let state = cloneData(seedData);
let currentRole = 'admin';
let currentIdentity = null;
let remoteProfiles = [];
let remoteAccessEnabled = false;

const isLocalPreview = () => ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
const currentPanelRole = () => roleSelect?.value || currentRole;

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
    accessGrants: Array.isArray(parsed.accessGrants) ? parsed.accessGrants : cloneData(seedData.accessGrants),
  };
};

const escapeHtml = (value) => String(value || '').replace(/[&<>"]/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
}[character]));

const formatStatus = (status) => statusLabels[status] || inquiryStatusLabels[status] || status;

const formatRole = (role) => ({
  admin: 'Admin',
  manager: 'Manager',
  owner: 'Owner',
  customer: 'Customer',
}[role] || role);

const roleStatusClass = (role) => {
  if (role === 'admin') return 'status-warning';
  if (role === 'manager' || role === 'owner') return 'status-approved';
  return 'status-pending';
};

const profileStatusLabel = (status) => ({
  active: 'Active',
  pending_admin_grant: 'Pending approval',
  rejected: 'Rejected',
}[status] || status || 'Pending approval');

const profileStatusClass = (status) => {
  if (status === 'active') return 'status-approved';
  if (status === 'rejected') return 'status-warning';
  return 'status-pending';
};

const toUiGrant = (grant) => ({
  email: grant.email,
  role: grant.role,
  note: grant.note || 'Cloudflare D1 access grant',
  status: grant.status === 'active' ? 'Active' : grant.status,
});

const getLocalAccountProfile = () => {
  const stored = localStorage.getItem(accountProfileStorageKey);
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch (error) {
    return null;
  }
};

const normalizeProfileRole = (role) => (['customer', 'owner', 'manager'].includes(role) ? role : 'customer');

const profileCompanySummary = (profile) => [
  profile.companyName ? `Company: ${escapeHtml(profile.companyName)}` : '',
  profile.businessContext ? `Context: ${escapeHtml(profile.businessContext)}` : '',
  profile.companyWebsite ? `Website: ${escapeHtml(profile.companyWebsite)}` : '',
].filter(Boolean).join(' · ');

const getProfileActiveRole = (profile) => {
  const grant = state.accessGrants.find((item) => item.email?.toLowerCase() === profile.email?.toLowerCase());
  return grant?.role || profile.grantedRole || profile.defaultRole || 'customer';
};

const renderRegistrationCard = (profile) => {
  const requestedRole = normalizeProfileRole(profile.requestedRole);
  const currentRole = getProfileActiveRole(profile);
  const canReviewProfile = ['owner', 'manager'].includes(requestedRole) && profile.status === 'pending_admin_grant' && !profile.localOnly;
  const companySummary = profileCompanySummary(profile);

  return `
    <article class="registration-card">
      <div class="registration-meta">
        <strong>${escapeHtml(profile.name || profile.email || 'Unnamed account')}</strong>
        <span>${escapeHtml(profile.email)}</span>
        <span>Requested: ${escapeHtml(formatRole(requestedRole))} · Current: ${escapeHtml(formatRole(currentRole))}</span>
        <span>Status: <span class="status-pill ${profileStatusClass(profile.status)}">${escapeHtml(profileStatusLabel(profile.status))}</span></span>
        ${companySummary ? `<span>${companySummary}</span>` : '<span>Company context: not provided</span>'}
        ${profile.notes ? `<span>Notes: ${escapeHtml(profile.notes)}</span>` : ''}
        ${profile.localOnly ? '<span>Local preview request — save it through production D1 before final approval.</span>' : ''}
      </div>
      ${canReviewProfile ? `
        <div class="access-request-actions">
          <button class="mini-action" type="button" data-registration-action="approve" data-registration-email="${escapeHtml(profile.email)}" data-registration-role="${escapeHtml(requestedRole)}" ${!canApprove() ? 'disabled' : ''}>Approve</button>
          <button class="mini-action mini-action-warning" type="button" data-registration-action="reject" data-registration-email="${escapeHtml(profile.email)}" data-registration-role="${escapeHtml(requestedRole)}" ${!canApprove() ? 'disabled' : ''}>Reject</button>
        </div>
      ` : ''}
    </article>
  `;
};


const statusClass = (status) => {
  if (status === 'published' || status === 'approved' || status === 'won') return 'status-approved';
  if (status === 'pending_review' || status === 'new' || status === 'researching') return 'status-pending';
  if (status === 'needs_changes' || status === 'lost') return 'status-warning';
  return '';
};

const canApprove = () => currentPanelRole() === 'admin';
const canReview = () => currentPanelRole() === 'admin' || currentPanelRole() === 'manager';

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

const slugify = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .replace(/-{2,}/g, '-');

const normalizeSlug = (value, fallback = 'new-offer') => slugify(value) || fallback;

const yamlString = (value) => `"${String(value || '').replace(/"/g, '\\"')}"`;

const yamlList = (items) => {
  if (!items.length) return '[]';
  return `\n${items.map((item) => `  - ${item}`).join('\n')}`;
};

const getOfferDraft = (form) => {
  const formData = new FormData(form);
  const kind = String(formData.get('kind') || 'accommodation');
  const title = String(formData.get('title') || '').trim();
  const slug = normalizeSlug(formData.get('slug') || title);
  const country = String(formData.get('country') || 'slovenia');
  const region = String(formData.get('region') || 'alps');
  const type = String(formData.get(kind === 'trip' ? 'trip_type' : 'type') || 'villa');
  const options = formData.getAll('options').map((option) => String(option));
  const summary = String(formData.get('summary') || '').trim();
  const highlights = String(formData.get('highlights') || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
  const priceFrom = String(formData.get('price_from') || '').trim();
  const bestFor = String(formData.get('best_for') || '').trim();
  const folder = kind === 'trip' ? tripFolders[type] : accommodationFolders[type];
  const path = kind === 'trip'
    ? `content/offers/${country}/trips/${folder}/${slug}.md`
    : `content/offers/${country}/accommodation/${folder}/${slug}.md`;
  const typeLabel = kind === 'trip' ? taxonomyLabels.tripTypes[type] : taxonomyLabels.accommodationTypes[type];

  const fields = kind === 'trip'
    ? [
      ['title', yamlString(title)],
      ['slug', slug],
      ['status', 'draft'],
      ['country', country],
      ['trip_type', type],
      ['route_regions', yamlList([region])],
      ['duration', yamlString(priceFrom || 'To be confirmed')],
      ['best_for', yamlList(bestFor ? bestFor.split(',').map((item) => item.trim()).filter(Boolean) : [])],
    ]
    : [
      ['title', yamlString(title)],
      ['slug', slug],
      ['status', 'draft'],
      ['country', country],
      ['region', region],
      ['type', type],
      ['options', yamlList(options)],
      ['price_from', yamlString(priceFrom || 'Upon request')],
      ['best_for', yamlString(bestFor)],
    ];

  const frontMatter = fields.map(([key, value]) => `${key}: ${value}`).join('\n');
  const highlightMarkdown = highlights.length
    ? `\n\n## Highlights\n\n${highlights.map((item) => `- ${item}`).join('\n')}`
    : '';
  const body = `---\n${frontMatter}\n---\n\n${summary || 'Add public-facing offer summary here.'}${highlightMarkdown}\n`;

  return {
    kind,
    title,
    slug,
    country,
    region,
    type,
    options,
    summary,
    highlights,
    priceFrom,
    bestFor,
    path,
    typeLabel,
    markdown: body,
  };
};

const renderOfferDraft = (draft) => {
  if (markdownOutput) markdownOutput.value = draft.markdown;
  if (offerPathTarget) offerPathTarget.textContent = draft.path;
  if (offerPreview) {
    const regionLabel = taxonomyLabels.regions[draft.region] || draft.region;
    const countryLabel = taxonomyLabels.countries[draft.country] || draft.country;
    const meta = draft.kind === 'trip'
      ? `${countryLabel} route · ${draft.typeLabel}`
      : `${countryLabel} · ${regionLabel} · ${draft.typeLabel}`;
    offerPreview.innerHTML = `
      <span class="status-pill status-pending">Draft</span>
      <h3>${escapeHtml(draft.title || 'Untitled offer')}</h3>
      <p>${escapeHtml(draft.summary || 'Add public-facing offer summary here.')}</p>
      <div class="offer-preview-meta">
        <span>${escapeHtml(meta)}</span>
        <span>${escapeHtml(draft.priceFrom || 'Upon request')}</span>
      </div>
      ${draft.highlights.length ? `<ul>${draft.highlights.slice(0, 4).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
    `;
  }
};

const toggleOfferKindFields = () => {
  const kind = offerBuilderForm?.querySelector('[data-offer-kind]')?.value || 'accommodation';
  offerBuilderForm?.querySelectorAll('[data-accommodation-field]').forEach((field) => {
    field.hidden = kind === 'trip';
  });
  offerBuilderForm?.querySelectorAll('[data-trip-field]').forEach((field) => {
    field.hidden = kind !== 'trip';
  });
};

const copyMarkdown = () => {
  const markdown = markdownOutput?.value || '';
  if (!markdown) return;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(markdown);
    return;
  }
  markdownOutput?.select();
  document.execCommand('copy');
};

const downloadMarkdown = () => {
  const markdown = markdownOutput?.value || '';
  if (!markdown) return;
  const slug = normalizeSlug(offerBuilderForm?.querySelector('[data-slug-input]')?.value || 'offer-draft');
  const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slug}.md`;
  link.click();
  URL.revokeObjectURL(url);
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
  const registrationList = document.querySelector('[data-registration-list]');
  const accessGrantList = document.querySelector('[data-access-grant-list]');

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

  if (registrationList) {
    const accountProfile = getLocalAccountProfile();
    const localProfiles = accountProfile?.email ? [{
      ...accountProfile,
      id: 'local-preview-request',
      status: accountProfile.status || (accountProfile.requestedRole === 'customer' ? 'active' : 'pending_admin_grant'),
      localOnly: true,
    }] : [];
    const profiles = isLocalPreview() ? [...localProfiles, ...remoteProfiles] : remoteProfiles;
    const roles = ['customer', 'owner', 'manager'];

    registrationList.innerHTML = roles.map((role) => {
      const roleProfiles = profiles.filter((profile) => normalizeProfileRole(profile.requestedRole) === role);
      return `
        <section class="registration-column" aria-label="${escapeHtml(formatRole(role))} registrations">
          <div class="card-head"><p class="eyebrow">${escapeHtml(formatRole(role))}</p><span class="status-pill">${roleProfiles.length}</span></div>
          ${roleProfiles.map(renderRegistrationCard).join('') || '<p class="empty-state">No registrations in this role.</p>'}
        </section>
      `;
    }).join('');
  }


  if (accessGrantList) {
    accessGrantList.innerHTML = state.accessGrants.map((grant) => `
      <div class="stack-item">
        <div><strong>${escapeHtml(grant.email)}</strong><span>${escapeHtml(grant.note || 'No access note')}</span></div>
        <span class="status-pill ${roleStatusClass(grant.role)}">${escapeHtml(formatRole(grant.role))}</span>
      </div>
    `).join('') || '<p class="empty-state">No access grants yet.</p>';
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
      <td><button class="mini-action" type="button" data-inquiry-action="${inquiry.id}" ${currentPanelRole() === 'owner' ? 'disabled' : ''}>Advance</button></td>
    </tr>
  `).join('');
};

const renderRoleAccess = () => {
  const role = currentPanelRole();
  document.body.dataset.panelRole = role;
  document.querySelectorAll('[data-admin-tab]').forEach((button) => {
    const tab = button.dataset.adminTab;
    const restrictedForOwner = role === 'owner' && ['people', 'settings'].includes(tab);
    button.disabled = restrictedForOwner;
  });
};


const setAuthCard = ({ status, email, role, approved }) => {
  if (authStatus) authStatus.textContent = status;
  if (authEmail) authEmail.textContent = email || 'No verified session';
  if (authRole) {
    authRole.textContent = role || 'Blocked';
    authRole.classList.toggle('status-approved', Boolean(approved));
    authRole.classList.toggle('status-warning', !approved);
    authRole.classList.toggle('status-pending', false);
  }
};

const getCloudflareIdentity = async () => {
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

const loadRemoteAccessGrants = async () => {
  if (!currentIdentity || isLocalPreview()) return;

  try {
    const response = await fetch('/api/admin/grants', {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    });

    if (!response.ok) {
      remoteAccessEnabled = false;
      return;
    }

    const data = await response.json();
    remoteAccessEnabled = true;
    remoteProfiles = Array.isArray(data.profiles) ? data.profiles : [];
    state.accessGrants = Array.isArray(data.grants) ? data.grants.map(toUiGrant) : state.accessGrants;
    saveState();
    render();
  } catch (error) {
    remoteAccessEnabled = false;
  }
};

const saveRemoteAccessGrant = async ({ email, role, note, action = 'approve' }) => {
  if (!currentIdentity || isLocalPreview()) return null;

  const response = await fetch('/api/admin/grants', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin',
    body: JSON.stringify({ email, role, note, action }),
  });

  if (!response.ok) {
    const message = await response.json().catch(() => ({}));
    throw new Error(message.error || 'Unable to save access grant in D1.');
  }

  const data = await response.json();
  remoteAccessEnabled = true;
  return {
    grant: data.grant ? toUiGrant(data.grant) : null,
    profile: data.profile || null,
    action: data.action || action,
  };
};

const unlockWorkspace = ({ role = 'admin', identity = null, localPreview = false } = {}) => {
  currentRole = role;
  currentIdentity = identity;
  if (adminApp) adminApp.hidden = false;
  if (rolePreview) rolePreview.hidden = !localPreview;
  setAuthCard({
    status: localPreview
      ? 'Local preview mode is active. Production access should be enforced by Cloudflare Access.'
      : 'Cloudflare Access session approved. Admin workspace is unlocked.',
    email: identity?.email || (localPreview ? 'localhost preview' : ''),
    role: localPreview ? 'Local preview' : role.toUpperCase(),
    approved: true,
  });
};

const lockWorkspace = () => {
  if (adminApp) adminApp.hidden = true;
  if (rolePreview) rolePreview.hidden = true;
  setAuthCard({
    status: 'Admin workspace is locked. Add a Cloudflare Access policy for /admin-panel.html and sign in with an approved admin email.',
    email: 'Cloudflare Access required',
    role: 'Locked',
    approved: false,
  });
};

const initialiseAdminAccess = async () => {
  const identity = await getCloudflareIdentity();

  if (identity) {
    unlockWorkspace({ role: 'admin', identity });
    return true;
  }

  if (isLocalPreview()) {
    unlockWorkspace({ role: roleSelect?.value || 'admin', localPreview: true });
    return true;
  }

  lockWorkspace();
  return false;
};

const render = () => {
  renderRoleAccess();
  renderStats();
  renderReviewList();
  renderPropertyTable();
  renderPeople();
  renderInquiryTable();
};

const initialiseAdminPanel = async () => {
  if (!adminApp) return;

  const isUnlocked = await initialiseAdminAccess();
  if (!isUnlocked) return;

  loadState();
  render();
  await loadRemoteAccessGrants();

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

  roleSelect?.addEventListener('change', () => {
    currentRole = roleSelect.value;
    render();
  });

  if (offerBuilderForm) {
    toggleOfferKindFields();

    const titleInput = offerBuilderForm.querySelector('input[name="title"]');
    const slugInput = offerBuilderForm.querySelector('[data-slug-input]');
    let slugEdited = Boolean(slugInput?.value);

    slugInput?.addEventListener('input', () => {
      slugEdited = true;
      slugInput.value = normalizeSlug(slugInput.value);
    });

    titleInput?.addEventListener('input', () => {
      if (!slugInput || slugEdited) return;
      slugInput.value = normalizeSlug(titleInput.value, '');
    });

    offerBuilderForm.querySelector('[data-offer-kind]')?.addEventListener('change', toggleOfferKindFields);

    offerBuilderForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const draft = getOfferDraft(offerBuilderForm);
      if (slugInput) slugInput.value = draft.slug;
      renderOfferDraft(draft);
    });
  }

  document.querySelector('[data-copy-markdown]')?.addEventListener('click', copyMarkdown);
  document.querySelector('[data-download-markdown]')?.addEventListener('click', downloadMarkdown);

  document.querySelector('[data-registration-list]')?.addEventListener('click', async (event) => {
    const actionButton = event.target.closest('[data-registration-action]');
    if (!actionButton || !canApprove()) return;

    const email = String(actionButton.dataset.registrationEmail || '').trim().toLowerCase();
    const role = String(actionButton.dataset.registrationRole || 'customer');
    const action = String(actionButton.dataset.registrationAction || 'approve');
    const note = action === 'approve'
      ? `Approved ${formatRole(role)} access from admin review`
      : `Rejected ${formatRole(role)} access from admin review`;
    if (!email || !['owner', 'manager'].includes(role)) return;

    try {
      const remoteResult = await saveRemoteAccessGrant({ email, role, note, action });
      const remoteGrant = remoteResult?.grant;
      const remoteProfile = remoteResult?.profile;
      const existingGrant = state.accessGrants.find((grant) => grant.email.toLowerCase() === email);

      if (action === 'approve') {
        if (existingGrant) {
          existingGrant.role = remoteGrant?.role || role;
          existingGrant.note = remoteGrant?.note || note;
          existingGrant.status = remoteGrant?.status || 'Active';
        } else {
          state.accessGrants.unshift(remoteGrant || { email, role, note, status: 'Active' });
        }
      } else if (existingGrant) {
        existingGrant.role = remoteGrant?.role || 'customer';
        existingGrant.note = remoteGrant?.note || note;
        existingGrant.status = remoteGrant?.status || 'Active';
      }

      remoteProfiles = remoteProfiles.map((profile) => (profile.email === email
        ? { ...profile, ...(remoteProfile || {}), status: action === 'approve' ? 'active' : 'rejected' }
        : profile));
      saveState();
      render();
    } catch (error) {
      setAuthCard({
        status: `${error.message} Check the D1 binding and that your email has an admin access_grant.`,
        email: currentIdentity?.email || 'Cloudflare Access required',
        role: 'D1 warning',
        approved: false,
      });
    }
  });

  document.querySelector('[data-access-grant-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!canApprove()) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get('email') || '').trim().toLowerCase();
    const role = String(formData.get('role') || 'customer');
    const note = String(formData.get('note') || '').trim();
    if (!email) return;

    try {
      const remoteResult = await saveRemoteAccessGrant({ email, role, note });
      const remoteGrant = remoteResult?.grant;
      const existingGrant = state.accessGrants.find((grant) => grant.email.toLowerCase() === email);
      if (existingGrant) {
        existingGrant.role = remoteGrant?.role || role;
        existingGrant.note = remoteGrant?.note || note || existingGrant.note;
        existingGrant.status = remoteGrant?.status || 'Active';
      } else {
        state.accessGrants.unshift(remoteGrant || { email, role, note, status: 'Active' });
      }
      remoteProfiles = remoteProfiles.filter((profile) => profile.email !== email);
    } catch (error) {
      setAuthCard({
        status: `${error.message} Check the D1 binding and that your email has an admin access_grant.`,
        email: currentIdentity?.email || 'Cloudflare Access required',
        role: 'D1 warning',
        approved: false,
      });
      return;
    }

    saveState();
    form.reset();
    render();
  });

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
    if (inquiryButton && currentPanelRole() !== 'owner') {
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
};

initialiseAdminPanel();
