// ---------- PLANÈTE : effet de rotation au mouvement de la souris ----------

const planetInner = document.querySelector(".hero-planet-inner");
const planetWrapper = document.querySelector(".hero-planet");

if (planetInner && planetWrapper) {
  const maxTilt = 18; // degrés max

  planetWrapper.addEventListener("mousemove", (event) => {
    const rect = planetWrapper.getBoundingClientRect();
    const x = event.clientX - rect.left; // position souris dans le bloc
    const y = event.clientY - rect.top;

    const percentX = (x / rect.width) - 0.5; // -0.5 à +0.5
    const percentY = (y / rect.height) - 0.5;

    const rotateY = -percentX * maxTilt; // gauche/droite
    const rotateX = percentY * maxTilt;  // haut/bas

    planetInner.style.transform = `
      perspective(700px)
      rotateX(${rotateX}deg)
      rotateY(${rotateY}deg)
      scale(1.03)
    `;
    planetInner.style.boxShadow = "0 25px 55px rgba(15,23,42,0.4)";
  });

  planetWrapper.addEventListener("mouseleave", () => {
    planetInner.style.transform = `
      perspective(700px)
      rotateX(0deg)
      rotateY(0deg)
      scale(1)
    `;
    planetInner.style.boxShadow = "0 18px 40px rgba(15,23,42,0.35)";
  });
}

// ---------- Scroll doux pour le lien "Voir comment ça marche" ----------

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (e) => {
    const targetId = link.getAttribute("href").slice(1);
    const target = document.getElementById(targetId);
    if (target) {
      e.preventDefault();
      window.scrollTo({
        top: target.offsetTop - 80,
        behavior: "smooth",
      });
    }
  });
});
