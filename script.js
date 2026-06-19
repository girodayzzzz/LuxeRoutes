const header = document.querySelector('[data-header]');

document.querySelectorAll('[data-current-year]').forEach((year) => {
  year.textContent = String(new Date().getFullYear());
});

const navAccountSessionKey = 'luxeroutes-account-session-v1';
const affiliateReferralStorageKey = 'luxeroutes-affiliate-referral-v1';

const getStoredAffiliateReferral = () => {
  try {
    return JSON.parse(localStorage.getItem(affiliateReferralStorageKey) || 'null');
  } catch (error) {
    return null;
  }
};

const storeAffiliateReferral = (referralCode) => {
  const cleanCode = String(referralCode || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-/g, '');
  if (!cleanCode) return null;
  const referral = { code: cleanCode, capturedAt: new Date().toISOString(), landingPage: window.location.href };
  try { localStorage.setItem(affiliateReferralStorageKey, JSON.stringify(referral)); } catch (error) {}
  return referral;
};

const getAffiliateVisitorKey = () => {
  const key = 'luxeroutes-affiliate-visitor-v1';
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const next = `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, next);
    return next;
  } catch (error) {
    return '';
  }
};

const trackAffiliateReferralVisit = async () => {
  const params = new URLSearchParams(window.location.search);
  const referral = storeAffiliateReferral(params.get('ref') || params.get('affiliate') || params.get('referral')) || getStoredAffiliateReferral();
  if (!referral?.code) return;
  try {
    await fetch('/api/affiliate/click', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ referralCode: referral.code, targetUrl: window.location.href, sourceUrl: document.referrer, visitorKey: getAffiliateVisitorKey() }),
    });
  } catch (error) {}
};

trackAffiliateReferralVisit();


const parseAccountSession = (stored) => {
  try {
    const session = JSON.parse(stored || 'null');
    if (!session?.expiresAt || Date.now() >= session.expiresAt) return null;
    return session;
  } catch (error) {
    return null;
  }
};

const readAccountSession = () => {
  const session = parseAccountSession(sessionStorage.getItem(navAccountSessionKey))
    || parseAccountSession(localStorage.getItem(navAccountSessionKey));

  if (!session) {
    sessionStorage.removeItem(navAccountSessionKey);
    localStorage.removeItem(navAccountSessionKey);
  }

  return session;
};

const getPathPrefix = () => (window.location.pathname.includes('/admin/') ? '../' : '');

const accountRoles = ['customer', 'owner', 'manager', 'admin', 'partner'];
const accountRoleHomePaths = {
  customer: 'account.html',
  owner: 'owner-panel.html',
  manager: 'manager-panel.html',
  admin: 'admin/index.html',
  partner: 'account.html',
};

const getSessionRole = (session) => session?.role || session?.grant?.role || session?.profile?.defaultRole || '';

const normalizeSessionRole = (role) => (accountRoles.includes(role) ? role : 'customer');

const getRoleAccountHref = (role, prefix = '') => {
  const target = accountRoleHomePaths[normalizeSessionRole(role)] || accountRoleHomePaths.customer;
  if (!target.startsWith('admin/')) return `${prefix}${target}`;
  return prefix ? target.replace('admin/', '') : target;
};

const privateAccessRules = {
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
  const role = normalizeSessionRole(getSessionRole(session));
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
  const visibleLabels = new Set(['Home', 'Destinations', 'Stays', 'Experiences', 'Partners', 'Journal', 'Contact', 'Partner Offers', 'Private Offers', isLoggedIn ? 'Account' : 'Login', 'Plan a Trip', 'Plan My Trip']);

  document.querySelectorAll('[data-nav-login]').forEach((link) => {
    link.hidden = isLoggedIn;
    link.textContent = 'Login';
    link.href = `${prefix}login.html`;
    link.setAttribute('aria-label', 'Login to LuxeRoutes');
  });

  document.querySelectorAll('[data-nav-account]').forEach((link) => {
    link.hidden = !isLoggedIn;
    link.textContent = 'Account';
    link.href = getRoleAccountHref(getSessionRole(session), prefix);
    link.setAttribute('aria-label', isLoggedIn
      ? `Open LuxeRoutes account for ${session?.identity?.email || session?.profile?.email || 'signed-in user'}`
      : 'Open LuxeRoutes account dashboard');
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



const customerMarketingPages = new Set([
  'index.html',
  'destinations.html',
  'stays.html',
  'offers.html',
  'routes.html',
  'experiences.html',
  'plan-trip.html',
  'contact.html',
  'partner-signup.html',
  'partner-offers.html',
  'hotels.html',
  'apartments.html',
  'chalets.html',
  'villas.html',
  'cabins.html',
  'boutique-hotels.html',
  'wellness-retreats.html',
  'romantic-getaways.html',
  'private-transfers.html',
  'wine-tours.html',
  'fishing-escapes.html',
  'yacht-experiences.html',
  'other-offers.html',
  'slovenia.html',
  'croatia.html',
  'italy.html',
  'france.html',
  'austria.html',
  'switzerland.html',
]);
const customerFacingPage = customerMarketingPages.has(currentPage) && !window.location.pathname.includes('/admin/');

if (customerFacingPage) {
  document.documentElement.classList.add('customer-experience-ready');

  const progressBar = document.createElement('div');
  progressBar.className = 'page-progress';
  progressBar.setAttribute('aria-hidden', 'true');
  document.body.prepend(progressBar);

  const updatePageProgress = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
    progressBar.style.setProperty('--progress', progress.toFixed(4));
  };
  updatePageProgress();
  window.addEventListener('scroll', updatePageProgress, { passive: true });
  window.addEventListener('resize', updatePageProgress);

  const quickAssistPages = new Set(['index.html', 'destinations.html', 'stays.html', 'offers.html', 'routes.html', 'experiences.html', 'partner-offers.html']);
  if (quickAssistPages.has(currentPage)) {
    const assist = document.createElement('aside');
    assist.className = 'customer-assist';
    assist.setAttribute('aria-label', 'Quick LuxeRoutes actions');
    assist.innerHTML = `
      <a class="assist-primary" href="plan-trip.html#trip-brief">
        <span>Plan My Trip</span>
        <small>Private brief</small>
      </a>
      <a href="offers.html#stay-finder" aria-label="Browse curated stays">Stays</a>
      <a href="contact.html" aria-label="Open LuxeRoutes contact page">Contact</a>
      <button type="button" data-back-to-top aria-label="Back to top">↑</button>
    `;
    document.body.append(assist);

    const backToTop = assist.querySelector('[data-back-to-top]');
    const formControls = document.querySelectorAll('input, select, textarea');
    const updateAssistState = () => {
      assist.classList.toggle('is-elevated', window.scrollY > 420);
      assist.classList.toggle('is-compact', window.scrollY < 320);
      if (backToTop) backToTop.hidden = window.scrollY < 520;
    };
    const setAssistFormState = (isFormActive) => assist.classList.toggle('is-form-active', isFormActive);
    updateAssistState();
    window.addEventListener('scroll', updateAssistState, { passive: true });
    formControls.forEach((control) => {
      control.addEventListener('focus', () => setAssistFormState(true));
      control.addEventListener('blur', () => setAssistFormState(false));
    });
    backToTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  document.querySelectorAll('.has-dropdown > .nav-link').forEach((link) => {
    link.setAttribute('aria-haspopup', 'true');
  });

  const revealTargets = document.querySelectorAll('.section, .image-card, .plain-card, .route-card, .stay-offer-card, .final-cta .container');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });

    revealTargets.forEach((target) => {
      target.classList.add('reveal-on-scroll');
      revealObserver.observe(target);
    });
  } else {
    revealTargets.forEach((target) => target.classList.add('is-visible'));
  }
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


const inquiryDatePairs = [
  ['arrival_date', 'departure_date', 'Departure date must be after the arrival date.'],
  ['check_in', 'check_out', 'Check-out must be after check-in.'],
];

const getNamedFormField = (form, name) => Array.from(form.elements).find((field) => field.name === name);

const parseDateOnly = (value) => {
  if (!value) return null;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(timestamp) ? null : timestamp;
};

const validateInquiryDates = (form) => {
  for (const [startName, endName, message] of inquiryDatePairs) {
    const startField = getNamedFormField(form, startName);
    const endField = getNamedFormField(form, endName);
    const startTime = parseDateOnly(startField?.value);
    const endTime = parseDateOnly(endField?.value);
    if (startTime !== null && endTime !== null && endTime <= startTime) {
      endField?.setCustomValidity(message);
      endField?.reportValidity();
      return message;
    }
    endField?.setCustomValidity('');
  }
  return '';
};

const syncInquiryDateMinimums = (form) => {
  inquiryDatePairs.forEach(([startName, endName]) => {
    const startField = getNamedFormField(form, startName);
    const endField = getNamedFormField(form, endName);
    if (!startField || !endField) return;
    const updateMinimum = () => {
      endField.min = startField.value || '';
      if (endField.value) validateInquiryDates(form);
    };
    startField.addEventListener('change', updateMinimum);
    endField.addEventListener('change', () => validateInquiryDates(form));
    updateMinimum();
  });
};

const collectInquiryPayload = (form, formData) => {
  const payload = {
    inquiry_type: form.dataset.formType || 'LuxeRoutes inquiry',
    submitted_from: window.location.href,
    submitted_at: new Date().toISOString(),
  };

  const affiliateReferral = getStoredAffiliateReferral();
  if (affiliateReferral?.code) payload.affiliate_referral_code = affiliateReferral.code;

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

document.querySelectorAll('[data-affiliate-application-form]').forEach((form) => {
  const status = document.createElement('p');
  status.className = 'form-status';
  status.setAttribute('role', 'status');
  form.append(status);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    if (String(formData.get('website') || '').trim()) {
      status.textContent = 'Thank you. Your affiliate application has been received.';
      form.reset();
      return;
    }

    const payload = Object.fromEntries(formData.entries());
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    form.setAttribute('aria-busy', 'true');
    status.classList.remove('is-error', 'is-success');
    status.textContent = 'Sending your affiliate application to LuxeRoutes…';

    try {
      const response = await fetch(form.dataset.endpoint || '/api/affiliate/apply', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to send your affiliate application.');
      status.classList.add('is-success');
      status.textContent = 'Thank you. Your affiliate application is pending admin review.';
      form.reset();
    } catch (error) {
      status.classList.add('is-error');
      status.textContent = error.message || 'Unable to send your affiliate application right now.';
    } finally {
      form.removeAttribute('aria-busy');
      if (submitButton) submitButton.disabled = false;
      status.focus();
    }
  });
});


document.querySelectorAll('.site-footer ul').forEach((list) => {
  if (list.querySelector('a[href="become-affiliate.html"]')) return;
  const item = document.createElement('li');
  const link = document.createElement('a');
  link.href = 'become-affiliate.html';
  link.textContent = 'Become an Affiliate';
  item.append(link);
  list.append(item);
});

document.querySelectorAll('[data-inquiry-form]').forEach((form, formIndex) => {
  const status = document.createElement('p');
  status.className = 'form-status';
  status.setAttribute('role', 'status');
  status.setAttribute('tabindex', '-1');
  form.append(status);

  const draftKey = `luxeroutes-inquiry-draft:${window.location.pathname}:${form.id || formIndex}`;
  const draftFields = Array.from(form.elements).filter((field) => field.name && field.type !== 'hidden' && field.name !== 'website');
  const readDraft = () => {
    try {
      return JSON.parse(localStorage.getItem(draftKey) || '{}');
    } catch (error) {
      return {};
    }
  };
  const restoreDraft = () => {
    const draft = readDraft();
    draftFields.forEach((field) => {
      if (!Object.prototype.hasOwnProperty.call(draft, field.name) || field.value) return;
      if (field.type === 'checkbox' || field.type === 'radio') {
        field.checked = Array.isArray(draft[field.name])
          ? draft[field.name].includes(field.value)
          : draft[field.name] === field.value;
        return;
      }
      field.value = draft[field.name];
    });
  };
  const saveDraft = () => {
    const draft = {};
    draftFields.forEach((field) => {
      if (field.type === 'checkbox') {
        if (!draft[field.name]) draft[field.name] = [];
        if (field.checked) draft[field.name].push(field.value);
        return;
      }
      if (field.type === 'radio') {
        if (field.checked) draft[field.name] = field.value;
        return;
      }
      if (field.value.trim()) draft[field.name] = field.value.trim();
    });

    try {
      if (Object.keys(draft).length) {
        localStorage.setItem(draftKey, JSON.stringify(draft));
      } else {
        try { localStorage.removeItem(draftKey); } catch (error) {}
      }
    } catch (error) {
      // Draft saving is a convenience feature; keep the inquiry form usable if storage is unavailable.
    }
  };

  restoreDraft();
  syncInquiryDateMinimums(form);
  form.addEventListener('input', saveDraft);
  form.addEventListener('change', saveDraft);

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
    const dateError = validateInquiryDates(form);
    if (dateError) {
      status.classList.add('is-error');
      status.textContent = dateError;
      status.focus({ preventScroll: true });
      return;
    }

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
      try { localStorage.removeItem(draftKey); } catch (error) {}
      form.removeAttribute('aria-busy');
      if (submitButton) submitButton.disabled = false;
      return;
    }

    try {
      await submitInquiryPayload(endpoint, payload, formData);
      status.classList.add('is-success');
      status.textContent = 'Thank you. Your inquiry has been received — LuxeRoutes will review it and reply within 48 hours.';
      form.reset();
      try { localStorage.removeItem(draftKey); } catch (error) {}
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
  const resultsTarget = offerFilterRoot.querySelector('[data-offer-results]');
  const resultCount = offerFilterRoot.querySelector('[data-result-count]');
  const noResults = offerFilterRoot.querySelector('[data-no-results]');
  const resetButton = offerFilterRoot.querySelector('[data-filter-reset]');
  const escapeOfferHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
  const typeLabels = { villa: 'Private villa', chalet: 'Chalet', 'boutique-hotel': 'Boutique hotel', apartment: 'Apartment', cabin: 'Cabin', retreat: 'Wellness retreat', 'wine-tasting': 'Wine tasting', 'food-experience': 'Food experience', 'private-transfer': 'Private transfer', 'yacht-experience': 'Yacht experience', 'fishing-escape': 'Fishing escape', 'wellness-experience': 'Wellness experience', 'guided-route': 'Guided route', 'event-service': 'Event or concierge service' };
  const bestForLabels = {
    villa: 'Best for families, privacy, and longer stays',
    chalet: 'Best for alpine weeks and fireside downtime',
    'boutique-hotel': 'Best for service-led escapes and short stays',
    apartment: 'Best for independent city or lakeside living',
    cabin: 'Best for slower countryside resets',
    retreat: 'Best for wellness-led itineraries',
    'wine-tasting': 'Best for cellar visits, tastings, and vineyard days',
    'food-experience': 'Best for private chefs, tastings, and culinary moments',
    'private-transfer': 'Best for airport pickups, drivers, and route logistics',
    'yacht-experience': 'Best for coast days, islands, and private sea time',
    'fishing-escape': 'Best for guided fishing and nature-led escapes',
    'wellness-experience': 'Best for spa, reset, and recovery moments',
    'guided-route': 'Best for hosted routes and local insight',
    'event-service': 'Best for celebrations, proposals, and concierge extras',
  };
  let offerCards = offerFilterRoot.querySelectorAll('[data-offer-card]');

  const addOfferGuidance = (card) => {
    const body = card.querySelector('.stay-offer-body');
    if (!body || body.querySelector('.offer-best-for')) return;
    const guidance = document.createElement('p');
    guidance.className = 'offer-best-for';
    guidance.textContent = bestForLabels[card.dataset.type] || 'Best for a private, inquiry-led LuxeRoutes proposal';
    const featureList = body.querySelector('ul');
    body.insertBefore(guidance, featureList || body.querySelector('.offer-footer'));
  };

  const wireRequestLink = (card) => {
    const requestLink = card.querySelector('.offer-footer a');
    const offerTitle = card.querySelector('h3')?.textContent.trim();
    addOfferGuidance(card);
    if (!requestLink || !offerTitle) return;
    const slug = card.dataset.slug || card.dataset.offerSlug || '';
    const query = new URLSearchParams({
      offer: offerTitle,
      request_type: 'Specific accommodation',
      stay_preference: formatLabel(card.dataset.type || 'Curated stay'),
      region: [formatLabel(card.dataset.country || ''), formatLabel(card.dataset.region || '')].filter(Boolean).join(' · '),
      source_url: `${window.location.origin}${window.location.pathname}#stay-finder`,
    });
    requestLink.href = slug ? `offer/${encodeURIComponent(slug)}` : `plan-trip.html?${query.toString()}#trip-brief`;
    requestLink.textContent = slug ? 'View full offer' : 'Request this stay';
    card.addEventListener('click', (event) => {
      if (event.target.closest('a, button, input, select, textarea')) return;
      if (slug) window.location.href = `offer/${encodeURIComponent(slug)}`;
    });
    if (slug) card.setAttribute('tabindex', '0');
  };

  offerCards.forEach(wireRequestLink);
  const getSelectedOptions = () => Array.from(optionFilters).filter((input) => input.checked).map((input) => normalizeFilterValue(input.value));
  const cardMatchesSelect = (card, filterName, filterValue) => filterValue === 'all' || normalizeFilterValue(card.dataset[filterName]).split(/\s+/).includes(filterValue);
  const cardMatchesOptions = (card, selectedOptions) => !selectedOptions.length || selectedOptions.every((option) => normalizeFilterValue(card.dataset.options).split(/\s+/).includes(option));
  const cardMatchesSearch = (card, searchValue) => !searchValue || searchValue.split(/\s+/).every((term) => [card.dataset.search, card.dataset.country, card.dataset.region, card.dataset.type, card.dataset.options, card.querySelector('h3')?.textContent, card.querySelector('p')?.textContent].filter(Boolean).join(' ').toLowerCase().includes(term));
  const updateOffers = () => {
    const selectedOptions = getSelectedOptions();
    const searchValue = normalizeFilterValue(searchInput?.value);
    let visibleCount = 0;
    offerCards.forEach((card) => {
      const matchesSelects = Array.from(selectFilters).every((select) => cardMatchesSelect(card, select.dataset.filterSelect, normalizeFilterValue(select.value)));
      const isVisible = matchesSelects && cardMatchesOptions(card, selectedOptions) && cardMatchesSearch(card, searchValue);
      card.classList.toggle('is-hidden', !isVisible);
      if (isVisible) visibleCount += 1;
    });
    if (resultCount) resultCount.textContent = String(visibleCount);
    if (noResults) noResults.hidden = visibleCount !== 0;
  };
  const renderDatabaseOffers = async () => {
    if (!resultsTarget) return;
    try {
      const response = await fetch('/api/offers', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Offer endpoint returned ${response.status}`);
      const data = await response.json();
      const publishedOffers = Array.isArray(data.offers) ? data.offers : [];
      publishedOffers.forEach((offer) => {
        const card = document.createElement('article');
        card.className = 'stay-offer-card';
        card.dataset.offerCard = '';
        card.dataset.databaseOffer = offer.id;
        card.dataset.country = offer.country;
        card.dataset.region = offer.region;
        card.dataset.type = offer.stayType;
        card.dataset.options = offer.options || '';
        card.dataset.slug = offer.slug || '';
        card.dataset.search = [offer.title, offer.locationLabel, offer.description, offer.country, offer.region, offer.stayType, offer.options].join(' ').toLowerCase();
        const imageUrl = offer.imageUrl || 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=80';
        card.innerHTML = `<div class="offer-image-wrap"><img src="${escapeOfferHtml(imageUrl)}" alt="${escapeOfferHtml(offer.imageAlt || offer.title)}" loading="lazy" width="900" height="600" decoding="async" /><span class="offer-badge">${escapeOfferHtml(offer.locationLabel)}</span></div><div class="stay-offer-body"><div class="offer-meta"><span>${escapeOfferHtml(typeLabels[offer.stayType] || formatLabel(offer.stayType))}</span><span>${escapeOfferHtml(offer.guestLabel || 'By private request')}</span></div><h3>${escapeOfferHtml(offer.title)}</h3><p>${escapeOfferHtml(offer.description)}</p><div class="offer-footer"><span>${escapeOfferHtml(offer.priceLabel || 'Price by private request')}</span><a class="text-link" href="offer/${encodeURIComponent(offer.slug || '')}">View full offer</a></div></div>`;
        resultsTarget.prepend(card);
        wireRequestLink(card);
      });
      offerCards = offerFilterRoot.querySelectorAll('[data-offer-card]');
      updateOffers();
    } catch (error) {
      console.warn('Database-backed offers could not be loaded; showing curated static offers.', error);
    }
  };

  selectFilters.forEach((select) => select.addEventListener('change', updateOffers));
  optionFilters.forEach((input) => input.addEventListener('change', updateOffers));
  searchInput?.addEventListener('input', updateOffers);
  resetButton?.addEventListener('click', () => {
    selectFilters.forEach((select) => { select.value = 'all'; });
    optionFilters.forEach((input) => { input.checked = false; });
    if (searchInput) searchInput.value = '';
    updateOffers();
  });
  updateOffers();
  renderDatabaseOffers();
}


const offerDetailRoot = document.querySelector('[data-offer-detail]');
if (offerDetailRoot) {
  const escapeOfferDetailHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
  const detailParams = new URLSearchParams(window.location.search);
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const pathSlug = pathParts[0] === 'offer' ? pathParts.slice(1).join('/') : pathParts[0] === 'offer.html' ? pathParts.slice(1).join('/') : '';
  const slug = detailParams.get('slug') || decodeURIComponent(pathSlug || '');
  const titleTarget = offerDetailRoot.querySelector('[data-offer-title]');
  const descriptionTarget = offerDetailRoot.querySelector('[data-offer-description]');
  const heroImage = offerDetailRoot.querySelector('[data-offer-hero-image]');
  const factsTarget = offerDetailRoot.querySelector('[data-offer-facts]');
  const availabilityTarget = offerDetailRoot.querySelector('[data-offer-availability]');
  const galleryTarget = offerDetailRoot.querySelector('[data-offer-gallery]');
  const setField = (name, value) => offerDetailRoot.querySelectorAll(`[data-offer-field="${name}"]`).forEach((field) => { field.value = value || ''; });
  const renderLines = (text) => String(text || '').split(/\n+/).map((line) => line.trim()).filter(Boolean).map((line) => `<span>${escapeOfferDetailHtml(line)}</span>`).join('');
  const renderOfferDetail = (offer) => {
    document.title = `${offer.title} | LuxeRoutes`;
    if (titleTarget) titleTarget.textContent = offer.title || 'Curated stay offer';
    if (descriptionTarget) descriptionTarget.textContent = offer.description || 'Request confirmed availability from LuxeRoutes.';
    if (heroImage && offer.imageUrl) heroImage.src = offer.imageUrl;
    setField('title', offer.title);
    setField('slug', offer.slug);
    const sourceUrl = offerDetailRoot.querySelector('[data-offer-source-url]');
    if (sourceUrl) sourceUrl.value = window.location.href;
    if (factsTarget) factsTarget.innerHTML = `
      <div class="stack-item"><strong>${escapeOfferDetailHtml(offer.locationLabel || 'Location by request')}</strong><span>${escapeOfferDetailHtml([formatLabel(offer.country), formatLabel(offer.region)].filter(Boolean).join(' · '))}</span></div>
      <div class="stack-item"><strong>${escapeOfferDetailHtml(formatLabel(offer.stayType || 'Stay'))}</strong><span>${escapeOfferDetailHtml(offer.guestLabel || 'Capacity by request')}</span></div>
      ${offer.accommodationDetails ? `<div class="stack-item stack-item-vertical"><strong>Accommodation details</strong>${renderLines(offer.accommodationDetails)}</div>` : ''}`;
    if (availabilityTarget) availabilityTarget.innerHTML = `
      <div class="stack-item"><strong>${escapeOfferDetailHtml(offer.priceLabel || 'Price by private request')}</strong><span>${escapeOfferDetailHtml(offer.discountLabel || 'Final quote confirmed after inquiry')}</span></div>
      <div class="stack-item"><strong>${escapeOfferDetailHtml([offer.availableFrom, offer.availableTo].filter(Boolean).join(' → ') || 'Availability on request')}</strong><span>${escapeOfferDetailHtml(offer.availabilityNotes || 'Owner can update availability from the owner panel.')}</span></div>
      ${offer.pricingDetails ? `<div class="stack-item stack-item-vertical"><strong>Pricing details</strong>${renderLines(offer.pricingDetails)}</div>` : ''}`;
    if (galleryTarget) {
      const urls = [offer.imageUrl, ...String(offer.galleryUrls || '').split(/\n+/)].filter(Boolean).slice(0, 9);
      galleryTarget.innerHTML = urls.map((url) => `<img src="${escapeOfferDetailHtml(url)}" alt="${escapeOfferDetailHtml(offer.title || 'LuxeRoutes offer')}" loading="lazy" decoding="async" />`).join('');
    }
  };
  if (!slug) {
    if (titleTarget) titleTarget.textContent = 'Offer not selected';
  } else {
    fetch(`/api/offers?slug=${encodeURIComponent(slug)}`, { headers: { Accept: 'application/json' } })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Offer not found.')))
      .then((data) => renderOfferDetail(data.offer || {}))
      .catch(() => { if (titleTarget) titleTarget.textContent = 'This offer is not available yet'; if (descriptionTarget) descriptionTarget.textContent = 'It may still be waiting for admin approval or may have been unpublished.'; });
  }
}
