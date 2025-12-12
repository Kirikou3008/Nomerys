// ===========================
// GLOBAL JS (toutes pages)
// ===========================

document.addEventListener("DOMContentLoaded", () => {
  // Reveal on scroll
  const els = document.querySelectorAll(".reveal");
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if(e.isIntersecting) e.target.classList.add("show");
    });
  }, { threshold: 0.12 });

  els.forEach(el => io.observe(el));

  // Smooth scroll for internal anchors
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener("click", (ev) => {
      const id = a.getAttribute("href");
      const target = document.querySelector(id);
      if(!target) return;
      ev.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
});
