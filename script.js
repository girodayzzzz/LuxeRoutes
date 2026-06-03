const header = document.querySelector('[data-header]');

document.querySelectorAll('[data-current-year]').forEach((year) => {
  year.textContent = String(new Date().getFullYear());
});


const navAccountSessionKey = 'luxeroutes-account-session-v1';

const navLogoutAccount = () => {
  sessionStorage.removeItem(navAccountSessionKey);
  window.location.href = `${getPathPrefix()}login.html`;
};

const ensureNavLogoutLinks = () => {
  document.querySelectorAll('.primary-nav').forEach((navElement) => {
    if (navElement.querySelector('[data-nav-logout]')) return;

    const accountLink = navElement.querySelector('[data-nav-account]');
    if (!accountLink) return;

    const logoutButton = document.createElement('button');
    logoutButton.type = 'button';
    logoutButton.className = 'nav-link nav-logout-button';
    logoutButton.dataset.navLogout = '';
    logoutButton.textContent = 'Logout';
    logoutButton.hidden = true;
    accountLink.insertAdjacentElement('afterend', logoutButton);
  });
};

const readAccountSession = () => {
  try {
    const session = JSON.parse(sessionStorage.getItem(navAccountSessionKey) || 'null');
    if (!session?.expiresAt || Date.now() >= session.expiresAt) return null;
    return session;
  } catch (error) {
    return null;
  }
};

const getPathPrefix = () => (window.location.pathname.includes('/admin/') ? '../' : '');

const getSessionRole = (session) => session?.role || session?.grant?.role || session?.profile?.defaultRole || '';

const privateAccessRules = {
  'partners.html': ['owner', 'partner'],
  'managers.html': ['manager'],
  'admin-panel.html': ['admin'],
  'index.html': null,
  'offers.html': null,
};

const protectPrivateAccessPage = () => {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const currentFile = pathParts[pathParts.length - 1] || 'index.html';
  const allowedRoles = privateAccessRules[currentFile];
  if (!allowedRoles) return;

  const session = readAccountSession();
  const isLoggedIn = Boolean(session?.identity?.email || session?.profile?.email);
  const role = getSessionRole(session);
  const prefix = getPathPrefix();

  if (!isLoggedIn) {
    const target = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.replace(`${prefix}login.html?redirect=${encodeURIComponent(target)}`);
    return;
  }

  if (!allowedRoles.includes(role)) {
    window.location.replace(`${prefix}account.html`);
  }
};

protectPrivateAccessPage();

const updateRoleBasedNavigation = () => {
  const session = readAccountSession();
  const isLoggedIn = Boolean(session?.identity?.email || session?.profile?.email);
  const prefix = getPathPrefix();
  ensureNavLogoutLinks();

  const visibleLabels = new Set(['Home', 'Destinations', 'Stays', 'Experiences', 'Journal', isLoggedIn ? 'Account' : 'Login', 'Plan a Trip']);
  if (isLoggedIn) visibleLabels.add('Logout');

  document.querySelectorAll('[data-nav-login]').forEach((link) => {
    link.hidden = isLoggedIn;
    link.textContent = 'Login';
    link.href = `${prefix}login.html`;
    link.setAttribute('aria-label', 'Login to LuxeRoutes');
  });

  document.querySelectorAll('[data-nav-account]').forEach((link) => {
    link.hidden = !isLoggedIn;
    link.textContent = 'Account';
    link.href = `${prefix}account.html`;
    link.setAttribute('aria-label', isLoggedIn
      ? `Open LuxeRoutes account for ${session?.identity?.email || session?.profile?.email || 'signed-in user'}`
      : 'Open LuxeRoutes account dashboard');
  });

  document.querySelectorAll('[data-nav-logout]').forEach((button) => {
    button.hidden = !isLoggedIn;
    button.textContent = 'Logout';
    button.setAttribute('aria-label', 'Logout of LuxeRoutes');
  });

  const adminNavLinks = new Set([
    ...document.querySelectorAll('[data-nav-admin]'),
    ...Array.from(document.querySelectorAll('.primary-nav > a[href]')).filter((link) => link.textContent.trim() === 'Admin Panel'),
  ]);

  adminNavLinks.forEach((link) => {
    link.hidden = true;
    link.href = `${prefix}admin/index.html`.replace('../admin/', '');
    link.setAttribute('aria-label', 'Open LuxeRoutes admin panel from Account');
  });

  document.querySelectorAll('.primary-nav a[href$="partners.html"], .primary-nav a[href$="managers.html"], .primary-nav a[href$="offers.html"], .primary-nav a[href$="routes.html"]').forEach((link) => {
    const directNavItem = link.parentElement?.classList.contains('primary-nav');
    if (!directNavItem && (link.getAttribute('href') || '').match(/(partners|managers)\.html$/)) link.hidden = true;
  });

  document.querySelectorAll('.primary-nav > .nav-link, .primary-nav > .nav-item, .primary-nav > .nav-cta').forEach((item) => {
    const label = item.dataset.navLabel
      || item.querySelector?.(':scope > .nav-link')?.textContent.trim().replace(/\s+/g, ' ')
      || item.textContent.trim().replace(/\s+/g, ' ');
    if (!label) return;
    item.hidden = !visibleLabels.has(label);
  });
};

updateRoleBasedNavigation();

document.addEventListener('click', (event) => {
  const logoutButton = event.target.closest('[data-nav-logout]');
  if (!logoutButton) return;

  event.preventDefault();
  navLogoutAccount();
});

const updateHeaderState = () => {
  if (!header) return;
  header.classList.toggle('scrolled', window.scrollY > 18);
};
updateHeaderState();
window.addEventListener('scroll', updateHeaderState, { passive: true });

const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.primary-nav a[href]').forEach((link) => {
  const href = link.getAttribute('href');
  if (href === currentPage) {
    link.classList.add('active');
    link.setAttribute('aria-current', 'page');

    const parentLink = link.closest('.nav-item')?.querySelector(':scope > .nav-link');
    if (parentLink && parentLink !== link) parentLink.classList.add('active');
  }
});

const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.primary-nav');

if (toggle && nav) {
  const closeMenu = () => {
    nav.classList.remove('open');
    document.body.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation');
  };

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    document.body.classList.toggle('nav-open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
  });

  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('click', (event) => {
    if (!nav.classList.contains('open')) return;
    if (nav.contains(event.target) || toggle.contains(event.target)) return;
    closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1021) closeMenu();
  });
}

const formatLabel = (name) => name.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const params = new URLSearchParams(window.location.search);

const setFieldValue = (field, value) => {
  if (!field || !value) return;
  const matchingOption = field.tagName === 'SELECT'
    ? Array.from(field.options).find((option) => option.value === value || option.textContent === value)
    : null;

  field.value = matchingOption ? matchingOption.value : value;
};

document.querySelectorAll('[data-prefill-param]').forEach((field) => {
  const value = params.get(field.dataset.prefillParam);
  setFieldValue(field, value);
});

const offerContext = document.querySelector('[data-offer-context]');
if (offerContext) {
  const offerName = params.get('offer');
  const offerType = params.get('request_type') || params.get('stay_preference');
  const region = params.get('region');
  const sourceUrlField = document.querySelector('[name="source_offer_url"]');

  if (sourceUrlField && offerName && !sourceUrlField.value) {
    sourceUrlField.value = `${window.location.origin}${window.location.pathname}${window.location.search}`;
  }

  if (offerName) {
    const title = offerContext.querySelector('[data-offer-context-title]');
    const meta = offerContext.querySelector('[data-offer-context-meta]');
    offerContext.hidden = false;
    if (title) title.textContent = offerName;
    if (meta) meta.textContent = [offerType, region].filter(Boolean).join(' · ') || 'Specific accommodation request';
  }
}

const collectInquiryPayload = (form, formData) => {
  const payload = {
    inquiry_type: form.dataset.formType || 'LuxeRoutes inquiry',
    submitted_from: window.location.href,
    submitted_at: new Date().toISOString(),
  };

  formData.forEach((value, key) => {
    const cleanValue = String(value).trim();
    if (key === 'website' || !cleanValue) return;

    if (payload[key]) {
      payload[key] = Array.isArray(payload[key]) ? [...payload[key], cleanValue] : [payload[key], cleanValue];
      return;
    }

    payload[key] = cleanValue;
  });

  return payload;
};

const buildInquiryBody = (form, formData) => {
  const payload = collectInquiryPayload(form, formData);
  const lines = [`${payload.inquiry_type}`, ''];

  Object.entries(payload).forEach(([key, value]) => {
    if (key === 'inquiry_type') return;
    lines.push(`${formatLabel(key)}: ${Array.isArray(value) ? value.join(', ') : value}`);
  });

  lines.push('', 'JSON payload:', JSON.stringify(payload, null, 2));
  return lines.join('\n');
};

const showInquiryFallback = (form, formData, status) => {
  const recipient = form.dataset.recipient || 'info@luxeroutes.eu';
  const offerName = String(formData.get('accommodation_interest') || '').trim();
  const subjectBase = form.dataset.formType || 'LuxeRoutes inquiry';
  const subject = encodeURIComponent(offerName ? `${subjectBase}: ${offerName}` : subjectBase);
  const body = encodeURIComponent(buildInquiryBody(form, formData));
  const mailtoUrl = `mailto:${recipient}?subject=${subject}&body=${body}`;

  status.innerHTML = `Thank you. Your inquiry details are ready, but the direct submission service is temporarily unavailable. Please email <a href="${mailtoUrl}">${recipient}</a> and we will reply within 48 hours.`;
};

const submitInquiryPayload = async (endpoint, payload, formData) => {
  const isFormspreeEndpoint = /(^|\.)formspree\.io$/i.test(new URL(endpoint, window.location.href).hostname);
  const headers = { Accept: 'application/json' };
  const body = isFormspreeEndpoint ? formData : JSON.stringify(payload);

  if (!isFormspreeEndpoint) {
    headers['Content-Type'] = 'application/json';
  } else {
    formData.set('inquiry_type', payload.inquiry_type);
    formData.set('submitted_from', payload.submitted_from);
    formData.set('submitted_at', payload.submitted_at);
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body,
  });

  if (!response.ok) throw new Error(`Inquiry endpoint returned ${response.status}`);
  return response;
};

document.querySelectorAll('[data-inquiry-form]').forEach((form) => {
  const status = document.createElement('p');
  status.className = 'form-status';
  status.setAttribute('role', 'status');
  status.setAttribute('tabindex', '-1');
  form.append(status);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    if (String(formData.get('website') || '').trim()) {
      status.textContent = 'Thank you. Your inquiry has been received.';
      form.reset();
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    const actionEndpoint = form.getAttribute('action');
    const endpoint = actionEndpoint?.includes('formspree.io') ? actionEndpoint : (form.dataset.endpoint || actionEndpoint);
    const payload = collectInquiryPayload(form, formData);

    if (submitButton) submitButton.disabled = true;
    form.setAttribute('aria-busy', 'true');
    status.classList.remove('is-error', 'is-success');
    status.textContent = endpoint
      ? 'Sending your private brief securely to LuxeRoutes…'
      : 'Preparing your inquiry on this page…';

    if (!endpoint) {
      status.textContent = 'Thank you. Your inquiry has been prepared — please email info@luxeroutes.eu if you do not hear from us within 48 hours.';
      form.reset();
      form.removeAttribute('aria-busy');
      if (submitButton) submitButton.disabled = false;
      return;
    }

    try {
      await submitInquiryPayload(endpoint, payload, formData);
      status.classList.add('is-success');
      status.textContent = 'Thank you. Your inquiry has been received — LuxeRoutes will review it and reply within 48 hours.';
      form.reset();
      status.focus({ preventScroll: true });
    } catch (error) {
      console.error(error);
      status.classList.add('is-error');
      showInquiryFallback(form, formData, status);
    } finally {
      form.removeAttribute('aria-busy');
      if (submitButton) submitButton.disabled = false;
    }
  });
});

const normalizeFilterValue = (value) => String(value || '').trim().toLowerCase();

const offerFilterRoot = document.querySelector('[data-offer-filter]');

if (offerFilterRoot) {
  const selectFilters = offerFilterRoot.querySelectorAll('[data-filter-select]');
  const optionFilters = offerFilterRoot.querySelectorAll('[data-filter-option]');
  const searchInput = offerFilterRoot.querySelector('[data-filter-search]');
  const offerCards = offerFilterRoot.querySelectorAll('[data-offer-card]');
  const resultCount = offerFilterRoot.querySelector('[data-result-count]');
  const noResults = offerFilterRoot.querySelector('[data-no-results]');
  const resetButton = offerFilterRoot.querySelector('[data-filter-reset]');

  offerCards.forEach((card) => {
    const requestLink = card.querySelector('.offer-footer a');
    const offerTitle = card.querySelector('h3')?.textContent.trim();
    if (!requestLink || !offerTitle) return;

    const query = new URLSearchParams({
      offer: offerTitle,
      request_type: 'Specific accommodation',
      stay_preference: formatLabel(card.dataset.type || 'Curated stay'),
      region: [formatLabel(card.dataset.country || ''), formatLabel(card.dataset.region || '')].filter(Boolean).join(' · '),
      source_url: `${window.location.origin}${window.location.pathname}#offers`,
    });

    requestLink.href = `plan-trip.html?${query.toString()}#trip-brief`;
    requestLink.textContent = 'Request this stay';
  });

  const getSelectedOptions = () => Array.from(optionFilters)
    .filter((input) => input.checked)
    .map((input) => normalizeFilterValue(input.value));

  const cardMatchesSelect = (card, filterName, filterValue) => {
    if (filterValue === 'all') return true;
    const cardValues = normalizeFilterValue(card.dataset[filterName]).split(/\s+/);
    return cardValues.includes(filterValue);
  };

  const cardMatchesOptions = (card, selectedOptions) => {
    if (!selectedOptions.length) return true;
    const cardOptions = normalizeFilterValue(card.dataset.options).split(/\s+/);
    return selectedOptions.every((option) => cardOptions.includes(option));
  };

  const cardMatchesSearch = (card, searchValue) => {
    if (!searchValue) return true;
    const haystack = [
      card.dataset.search,
      card.dataset.country,
      card.dataset.region,
      card.dataset.type,
      card.dataset.options,
      card.querySelector('h3')?.textContent,
      card.querySelector('p')?.textContent,
    ].filter(Boolean).join(' ').toLowerCase();

    return searchValue.split(/\s+/).every((term) => haystack.includes(term));
  };

  const updateOffers = () => {
    const selectedOptions = getSelectedOptions();
    const searchValue = normalizeFilterValue(searchInput?.value);
    let visibleCount = 0;

    offerCards.forEach((card) => {
      const matchesSelects = Array.from(selectFilters).every((select) => {
        const filterName = select.dataset.filterSelect;
        const filterValue = normalizeFilterValue(select.value);
        return cardMatchesSelect(card, filterName, filterValue);
      });
      const isVisible = matchesSelects && cardMatchesOptions(card, selectedOptions) && cardMatchesSearch(card, searchValue);

      card.classList.toggle('is-hidden', !isVisible);
      if (isVisible) visibleCount += 1;
    });

    if (resultCount) resultCount.textContent = String(visibleCount);
    if (noResults) noResults.hidden = visibleCount !== 0;
  };

  selectFilters.forEach((select) => select.addEventListener('change', updateOffers));
  optionFilters.forEach((input) => input.addEventListener('change', updateOffers));
  searchInput?.addEventListener('input', updateOffers);

  if (resetButton) {
    resetButton.addEventListener('click', () => {
      selectFilters.forEach((select) => {
        select.value = 'all';
      });
      optionFilters.forEach((input) => {
        input.checked = false;
      });
      if (searchInput) searchInput.value = '';
      updateOffers();
    });
  }

  updateOffers();
}
