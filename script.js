const header = document.querySelector('[data-header]');
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
    const parentLink = link.closest('.nav-item')?.querySelector(':scope > .nav-link');
    if (parentLink) parentLink.classList.add('active');
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

    const recipient = form.dataset.recipient || 'hello@luxeroutes.eu';
    const subject = encodeURIComponent(form.dataset.formType || 'LuxeRoutes inquiry');
    const body = encodeURIComponent(buildInquiryBody(form, formData));

    status.textContent = 'Opening your email client with the inquiry details ready to send.';
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
    form.reset();
  });
});
