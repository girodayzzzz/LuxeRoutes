const toggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('nav ul');

if (toggle && menu) {
  const closeMenu = () => {
    menu.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.setAttribute('aria-expanded', 'false');

  toggle.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) closeMenu();
  });
}

const year = document.querySelector('[data-year]');
if (year) {
  year.textContent = String(new Date().getFullYear());
}

const contactForm = document.querySelector('form.form-grid');
if (contactForm) {
  const status = document.createElement('p');
  status.className = 'form-status';
  status.setAttribute('role', 'status');
  contactForm.append(status);

  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    status.textContent = 'Thanks! Your message was captured successfully.';
    contactForm.reset();
  });
}
