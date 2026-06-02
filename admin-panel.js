const adminApp = document.querySelector('[data-admin-app]');
const roleSelect = document.querySelector('[data-role-select]');
const storageKey = 'luxeroutes-admin-panel-v1';
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
