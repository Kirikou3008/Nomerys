// -------- PLANÈTE : tilt à la souris --------

const planetInner = document.querySelector(".hero-planet-inner");
const planetWrapper = document.querySelector(".hero-planet");

if (planetInner && planetWrapper) {
  const maxTilt = 25; // plus grand pour que tu voies bien l'effet

  planetWrapper.addEventListener("mousemove", (event) => {
    const rect = planetWrapper.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const percentX = x / rect.width - 0.5; // -0.5 à +0.5
    const percentY = y / rect.height - 0.5;

    const rotateY = -percentX * maxTilt;
    const rotateX = percentY * maxTilt;

    planetInner.style.transform = `
      perspective(800px)
      rotateX(${rotateX}deg)
      rotateY(${rotateY}deg)
      scale(1.05)
    `;
    planetInner.style.boxShadow = "0 30px 70px rgba(0,0,0,0.9)";
  });

  planetWrapper.addEventListener("mouseleave", () => {
    planetInner.style.transform = `
      perspective(800px)
      rotateX(0deg)
      rotateY(0deg)
      scale(1)
    `;
    planetInner.style.boxShadow = "0 22px 55px rgba(0,0,0,0.85)";
  });
}

// -------- Scroll doux vers les ancres (#process, etc.) --------

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
