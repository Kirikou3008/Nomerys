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
