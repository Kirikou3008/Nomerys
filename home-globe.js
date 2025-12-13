// home-globe.js — version non-module (compatible GitHub Pages sans import ES modules)
// Dépendances chargées dans index.html : three.min.js + OrbitControls.js

(function () {
  const canvas = document.getElementById("globeCanvas");
  if (!canvas) return;

  // Sécurité : si THREE pas chargé
  if (typeof THREE === "undefined") {
    console.error("[home-globe] THREE n'est pas chargé. Vérifie les <script src=...three.min.js>.");
    return;
  }

  const scene = new THREE.Scene();

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 3);

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const dir = new THREE.DirectionalLight(0xffffff, 1.05);
  dir.position.set(3, 2, 4);
  scene.add(dir);

  // Globe
  const geometry = new THREE.SphereGeometry(1, 64, 64);

  const loader = new THREE.TextureLoader();
  const texture = loader.load(
    "./assets/earth.jpg",
    () => {},
    undefined,
    (e) => console.error("[home-globe] Texture introuvable: ./assets/earth.jpg", e)
  );

  // Meilleur rendu texture
  if (texture) {
    texture.anisotropy = 8;
    texture.colorSpace = THREE.SRGBColorSpace ? THREE.SRGBColorSpace : undefined;
  }

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.95,
    metalness: 0.0,
  });

  const globe = new THREE.Mesh(geometry, material);
  scene.add(globe);

  // Halo léger
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(1.02, 64, 64),
    new THREE.MeshBasicMaterial({ color: 0x2f7bff, transparent: true, opacity: 0.08 })
  );
  scene.add(glow);

  // OrbitControls (drag souris = rotation libre)
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  // Limites pour éviter de passer "derrière" (reste propre)
  controls.minPolarAngle = Math.PI * 0.18;
  controls.maxPolarAngle = Math.PI * 0.82;

  // Auto-rotation très légère seulement au repos
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.35;

  let isInteracting = false;
  let lastInteract = performance.now();

  function markInteract() {
    isInteracting = true;
    lastInteract = performance.now();
  }

  renderer.domElement.addEventListener("pointerdown", markInteract, { passive: true });
  renderer.domElement.addEventListener("pointermove", markInteract, { passive: true });
  window.addEventListener("pointerup", () => {
    // on laisse un petit délai avant de remettre l'auto-rotate
    isInteracting = false;
    lastInteract = performance.now();
  });

  // Resize canvas au parent
  function resize() {
    const parent = renderer.domElement.parentElement;
    const w = parent.clientWidth;
    const h = parent.clientHeight;

    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const ro = new ResizeObserver(resize);
  ro.observe(renderer.domElement.parentElement);
  resize();

  // Petit tilt suivant la souris (léger, n’empêche PAS le drag)
  let mouseX = 0;
  let mouseY = 0;

  function onMouseMove(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width; // 0..1
    const y = (e.clientY - rect.top) / rect.height; // 0..1
    mouseX = x - 0.5;
    mouseY = y - 0.5;
  }
  renderer.domElement.addEventListener("mousemove", onMouseMove);

  function animate() {
    const now = performance.now();

    // Auto-rotate seulement si l’utilisateur ne touche plus depuis ~900ms
    const idle = now - lastInteract > 900;
    controls.autoRotate = idle;

    // Tilt très léger (uniquement visuel)
    const tiltX = mouseY * 0.12;
    const tiltY = mouseX * 0.16;

    globe.rotation.x += (tiltX - globe.rotation.x) * 0.02;
    glow.rotation.x = globe.rotation.x;

    // On n’écrase PAS la rotation du drag (controls), on fait un micro effet
    globe.rotation.y += tiltY * 0.002;
    glow.rotation.y = globe.rotation.y;

    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();
})();
