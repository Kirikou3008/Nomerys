// Burger menu pour mobile
const burgerBtn = document.getElementById('burgerBtn');
const mainNav = document.getElementById('mainNav');

if (burgerBtn && mainNav) {
  burgerBtn.addEventListener('click', () => {
    mainNav.classList.toggle('nav-open');
  });
}

// Scroll doux pour les liens internes
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const targetId = link.getAttribute('href').slice(1);
    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      e.preventDefault();
      const y = targetEl.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top: y, behavior: 'smooth' });
      mainNav?.classList.remove('nav-open');
    }
  });
});

// Année dynamique dans le footer
const yearSpan = document.getElementById('yearSpan');
if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear().toString();
}
