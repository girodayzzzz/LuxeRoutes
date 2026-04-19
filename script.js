const toggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('nav ul');
if (toggle && menu) {
  toggle.addEventListener('click', () => menu.classList.toggle('open'));
}

const year = document.querySelector('[data-year]');
if (year) year.textContent = new Date().getFullYear();
