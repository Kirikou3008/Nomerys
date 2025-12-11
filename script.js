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

// =========================
// INTRO GLOBE 3D AVEC THREE
// =========================

(function () {
  const overlay = document.getElementById("intro-globe-overlay");
  const container = document.getElementById("intro-globe-container");
  if (!overlay || !container) return; // sécurité

  document.body.classList.add("intro-active");

  // --- Setup Three.js ---
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );

  // On démarre "près" de la Terre
  camera.position.set(0, 0, 1.8);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  container.appendChild(renderer.domElement);

  // Lumière douce
  const light = new THREE.DirectionalLight(0xffffff, 1.2);
  light.position.set(2, 1, 2);
  scene.add(light);

  const ambient = new THREE.AmbientLight(0x404040, 0.6);
  scene.add(ambient);

  // Terre
  const geometry = new THREE.SphereGeometry(1, 64, 64);
  const textureLoader = new THREE.TextureLoader();

  const earthTexture = textureLoader.load("assets/earth.jpg", () => {
    renderer.render(scene, camera);
  });

  const earthMaterial = new THREE.MeshPhongMaterial({
    map: earthTexture
  });

  const earth = new THREE.Mesh(geometry, earthMaterial);
  scene.add(earth);

  // On se place "au-dessus" d'une zone type Europe/Afrique
  earth.rotation.y = -Math.PI / 3;

  // Gestion redimensionnement
  window.addEventListener("resize", () => {
    if (!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  // --- Animation zoom + rotation ---
  const start = performance.now();
  const Z_START = 1.8; // très proche
  const Z_END = 4.2;   // plus loin
  const ZOOM_DURATION = 2800; // ms
  const TOTAL_INTRO = 4200;   // ms avant de cacher l'intro

  function animate(now) {
    requestAnimationFrame(animate);
    const elapsed = now - start;

    // Zoom out progress 0 → 1
    const t = Math.min(elapsed / ZOOM_DURATION, 1);

    // Interpolation camera Z
    const currentZ = Z_START + (Z_END - Z_START) * t;
    camera.position.z = currentZ;

    // Rotation de la planète (un peu plus rapide au début)
    const baseSpeed = 0.002;
    const extraSpeed = 0.01 * (1 - t); // plus rapide au début
    earth.rotation.y += baseSpeed + extraSpeed;

    renderer.render(scene, camera);

    // Après la durée totale, on masque l'intro une seule fois
    if (elapsed > TOTAL_INTRO && !overlay.classList.contains("hidden")) {
      overlay.classList.add("hidden");
      document.body.classList.remove("intro-active");

      // On supprime le canvas après l'animation de disparition
      setTimeout(() => {
        overlay.remove();
        renderer.dispose();
        geometry.dispose();
        earthMaterial.dispose();
        earthTexture.dispose();
      }, 1000);
    }
  }

  requestAnimationFrame(animate);
})();
