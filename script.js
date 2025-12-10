document.addEventListener("DOMContentLoaded", () => {
  const yearSpan = document.getElementById("year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  const yearContact = document.getElementById("year-contact");
  if (yearContact) {
    yearContact.textContent = new Date().getFullYear();
  }
});

// Effet parallax léger sur la planète
document.addEventListener("mousemove", (event) => {
  const orbit = document.querySelector(".planet-orbit");
  if (!orbit) return;

  const x = (event.clientX / window.innerWidth - 0.5) * 18;
  const y = (event.clientY / window.innerHeight - 0.5) * 18;

  orbit.style.transform = `translate3d(${x}px, ${y}px, 0)`;
});

(function () {
  const planet = document.getElementById("hero-planet");
  const hero = document.querySelector(".hero");

  if (!planet || !hero) return;

  const maxRotate = 16; // angle max en degrés
  const maxTranslate = 18; // déplacement max en px

  hero.addEventListener("mousemove", (event) => {
    const rect = hero.getBoundingClientRect();
    const x = event.clientX - rect.left; // position dans la hero
    const y = event.clientY - rect.top;

    const percentX = (x / rect.width - 0.5) * 2; // -1 à 1
    const percentY = (y / rect.height - 0.5) * 2;

    const rotateY = -percentX * maxRotate;
    const rotateX = percentY * maxRotate;
    const translateX = percentX * maxTranslate;
    const translateY = percentY * maxTranslate;

    planet.style.transform = `
      translate3d(${translateX}px, ${translateY}px, 0)
      rotateX(${rotateX}deg)
      rotateY(${rotateY}deg)
    `;
    planet.classList.add("is-active");
  });

  hero.addEventListener("mouseleave", () => {
    planet.style.transform = "translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg)";
    planet.classList.remove("is-active");
  });
})();
