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

const formatLabel = (name) => name.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const buildInquiryBody = (form, formData) => {
  const type = form.dataset.formType || 'LuxeRoutes inquiry';
  const lines = [`${type}`, ''];

  formData.forEach((value, key) => {
    if (key === 'website' || !String(value).trim()) return;
    lines.push(`${formatLabel(key)}: ${value}`);
  });

  lines.push('', `Submitted from: ${window.location.href}`);
  return lines.join('\n');
};

document.querySelectorAll('[data-inquiry-form]').forEach((form) => {
  const status = document.createElement('p');
  status.className = 'form-status';
  status.setAttribute('role', 'status');
  form.append(status);

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    if (String(formData.get('website') || '').trim()) {
      status.textContent = 'Thank you. Your inquiry has been received.';
      form.reset();
      return;
    }

    const recipient = form.dataset.recipient || 'info@luxeroutes.eu';
    const subject = encodeURIComponent(form.dataset.formType || 'LuxeRoutes inquiry');
    const body = encodeURIComponent(buildInquiryBody(form, formData));

    status.textContent = 'Opening your email client with the inquiry details ready to send.';
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
    form.reset();
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
