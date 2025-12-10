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
  const canvas = document.getElementById("hero-globe");
  if (!canvas || typeof THREE === "undefined") return;

  const scene = new THREE.Scene();

  // Taille de base (sera recalculée)
  let width = canvas.clientWidth;
  let height = canvas.clientHeight;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height, false);
  renderer.setClearColor(0x000000, 0); // fond transparent

  const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
  camera.position.set(0, 0, 3.6);
  scene.add(camera);

  // Sphère (planète)
  const geometry = new THREE.SphereGeometry(1.1, 64, 64);

  // Matériau stylisé bleu / violet, légèrement "glossy"
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#2563eb"),
    emissive: new THREE.Color("#1d4ed8"),
    roughness: 0.15,
    metalness: 0.4,
    clearcoat: 0.6,
    clearcoatRoughness: 0.15,
    sheen: 0.5,
    sheenColor: new THREE.Color("#93c5fd"),
  });

  const globe = new THREE.Mesh(geometry, material);
  scene.add(globe);

  // Légère "tache lumineuse" avec un spot
  const light1 = new THREE.DirectionalLight(0xffffff, 1.1);
  light1.position.set(2.5, 2, 2);
  scene.add(light1);

  const light2 = new THREE.DirectionalLight(0x60a5fa, 0.8);
  light2.position.set(-3, -2, -1.5);
  scene.add(light2);

  const ambient = new THREE.AmbientLight(0xffffff, 0.45);
  scene.add(ambient);

  // Animation & interaction souris
  let targetRotX = 0.3;
  let targetRotY = -0.4;
  let currentRotX = targetRotX;
  let currentRotY = targetRotY;

  const maxTilt = 0.4; // inclinaison max ajoutée par la souris

  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width; // 0 -> 1
    const y = (event.clientY - rect.top) / rect.height;

    const dx = (x - 0.5) * 2; // -1 -> 1
    const dy = (y - 0.5) * 2;

    targetRotY = -0.6 + dx * maxTilt;
    targetRotX = 0.3 + dy * maxTilt;
  }

  canvas.addEventListener("mousemove", onMouseMove);

  function onResize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  window.addEventListener("resize", onResize);

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const t = clock.getDelta();

    // Rotation automatique de base
    targetRotY -= t * 0.12;

    // Lissage vers la cible
    currentRotX += (targetRotX - currentRotX) * 0.08;
    currentRotY += (targetRotY - currentRotY) * 0.08;

    globe.rotation.x = currentRotX;
    globe.rotation.y = currentRotY;

    renderer.render(scene, camera);
  }

  onResize();
  animate();
})();
