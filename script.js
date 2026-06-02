const header = document.querySelector('[data-header]');

document.querySelectorAll('[data-current-year]').forEach((year) => {
  year.textContent = String(new Date().getFullYear());
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

const openMailFallback = (form, formData, status) => {
  const recipient = form.dataset.recipient || 'info@luxeroutes.eu';
  const offerName = String(formData.get('accommodation_interest') || '').trim();
  const subjectBase = form.dataset.formType || 'LuxeRoutes inquiry';
  const subject = encodeURIComponent(offerName ? `${subjectBase}: ${offerName}` : subjectBase);
  const body = encodeURIComponent(buildInquiryBody(form, formData));

  status.textContent = 'We could not submit directly, so your email client is opening with the inquiry details ready to send.';
  window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
};

const submitInquiryPayload = async (endpoint, payload) => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(`Inquiry endpoint returned ${response.status}`);
  return response;
};

document.querySelectorAll('[data-inquiry-form]').forEach((form) => {
  const status = document.createElement('p');
  status.className = 'form-status';
  status.setAttribute('role', 'status');
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
    const endpoint = form.dataset.endpoint;
    const payload = collectInquiryPayload(form, formData);

    if (submitButton) submitButton.disabled = true;
    form.setAttribute('aria-busy', 'true');
    status.classList.remove('is-error');
    status.textContent = endpoint
      ? 'Sending your private brief securely to LuxeRoutes…'
      : 'Opening your email client with the inquiry details ready to send.';

    if (!endpoint) {
      openMailFallback(form, formData, status);
      form.reset();
      form.removeAttribute('aria-busy');
      if (submitButton) submitButton.disabled = false;
      return;
    }

    try {
      await submitInquiryPayload(endpoint, payload);
      status.textContent = 'Thank you. Your inquiry has been received — LuxeRoutes will review it and reply within 48 hours.';
      form.reset();
    } catch (error) {
      console.error(error);
      status.classList.add('is-error');
      openMailFallback(form, formData, status);
      form.reset();
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

  const updateOffers = () => {
    const selectedOptions = getSelectedOptions();
    let visibleCount = 0;

    offerCards.forEach((card) => {
      const matchesSelects = Array.from(selectFilters).every((select) => {
        const filterName = select.dataset.filterSelect;
        const filterValue = normalizeFilterValue(select.value);
        return cardMatchesSelect(card, filterName, filterValue);
      });
      const isVisible = matchesSelects && cardMatchesOptions(card, selectedOptions);

      card.classList.toggle('is-hidden', !isVisible);
      if (isVisible) visibleCount += 1;
    });

    if (resultCount) resultCount.textContent = String(visibleCount);
    if (noResults) noResults.hidden = visibleCount !== 0;
  };

  selectFilters.forEach((select) => select.addEventListener('change', updateOffers));
  optionFilters.forEach((input) => input.addEventListener('change', updateOffers));

  if (resetButton) {
    resetButton.addEventListener('click', () => {
      selectFilters.forEach((select) => {
        select.value = 'all';
      });
      optionFilters.forEach((input) => {
        input.checked = false;
      });
      updateOffers();
    });
  }

  updateOffers();
}
