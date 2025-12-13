// home-globe.js (module) — Globe 3D (Three.js) avec drag souris + inertie + auto-rotation légère

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const canvas = document.getElementById("globeCanvas");

// Sécurité : si le canvas n’existe pas (ex: tu charges ce script sur une autre page), on stop.
if (!canvas) {
  console.warn("[home-globe] canvas introuvable (#globeCanvas).");
} else {
  // Scene / Camera / Renderer
  const scene = new THREE.Scene();

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 3.2);

  // Lights (pour que la texture soit "vivante")
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(2.5, 1.2, 2.8);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x78c6ff, 0.55);
  fill.position.set(-2.2, -1.0, 2.0);
  scene.add(fill);

  const ambient = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(ambient);

  // Group (pour rotation)
  const globeGroup = new THREE.Group();
  scene.add(globeGroup);

  // Texture
  const loader = new THREE.TextureLoader();
  const earthTexture = loader.load(
    "./assets/earth.jpg",
    () => {
      // OK loaded
    },
    undefined,
    (err) => {
      console.error("[home-globe] erreur chargement texture ./assets/earth.jpg", err);
    }
  );

  earthTexture.colorSpace = THREE.SRGBColorSpace;
  earthTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // Globe mesh
  const geometry = new THREE.SphereGeometry(1, 64, 64);

  const material = new THREE.MeshStandardMaterial({
    map: earthTexture,
    metalness: 0.05,
    roughness: 0.9,
  });

  const globe = new THREE.Mesh(geometry, material);
  globeGroup.add(globe);

  // Petit "rim light" (donne un contour glow)
  const rimMat = new THREE.MeshBasicMaterial({
    color: 0x2aaeff,
    transparent: true,
    opacity: 0.08,
    side: THREE.BackSide,
  });
  const rim = new THREE.Mesh(new THREE.SphereGeometry(1.02, 64, 64), rimMat);
  globeGroup.add(rim);

  // Taille / resize (super important sinon tu peux voir un rond “bizarre” ou rien)
  function resize() {
    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));

    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // ResizeObserver (plus fiable que window resize seul)
  const ro = new ResizeObserver(() => resize());
  ro.observe(canvas.parentElement);

  window.addEventListener("resize", resize);
  resize();

  // Interaction souris / touch : drag => rotation libre
  let isDown = false;
  let lastX = 0;
  let lastY = 0;

  // Inertie
  let velX = 0;
  let velY = 0;

  // Rotation actuelle (cible)
  let rotX = 0;
  let rotY = 0;

  // Limites pour éviter de retourner le globe à l’envers
  const minX = -Math.PI / 3; // -60°
  const maxX = Math.PI / 3;  // +60°

  function onPointerDown(e) {
    isDown = true;
    canvas.setPointerCapture?.(e.pointerId);

    lastX = e.clientX;
    lastY = e.clientY;
  }

  function onPointerMove(e) {
    if (!isDown) return;

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;

    lastX = e.clientX;
    lastY = e.clientY;

    // Sensibilité
    const speed = 0.005;

    rotY += dx * speed;
    rotX += dy * speed;

    // clamp
    rotX = Math.max(minX, Math.min(maxX, rotX));

    // inertie (on garde une vitesse)
    velY = dx * speed;
    velX = dy * speed;
  }

  function onPointerUp(e) {
    isDown = false;
    try {
      canvas.releasePointerCapture?.(e.pointerId);
    } catch (_) {}
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);

  // Empêche le scroll “bizarre” sur mobile quand tu drag
  canvas.style.touchAction = "none";

  // Animation loop
  const clock = new THREE.Clock();

  function animate() {
    const dt = Math.min(0.033, clock.getDelta());

    // Auto-rotation légère seulement quand on ne drag pas
    if (!isDown) {
      rotY += dt * 0.25; // vitesse auto
      // on laisse aussi une petite inertie résiduelle
      velX *= 0.92;
      velY *= 0.92;
      rotX += velX * 0.5;
      rotY += velY * 0.5;
      rotX = Math.max(minX, Math.min(maxX, rotX));
    }

    // Interpolation douce vers la rotation cible
    globeGroup.rotation.x += (rotX - globeGroup.rotation.x) * 0.12;
    globeGroup.rotation.y += (rotY - globeGroup.rotation.y) * 0.12;

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();
}
