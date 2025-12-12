/* =========================
   TravelAI — script.js
   - Globe 3D only if #globe-canvas exists
   - Reveal animations
   ========================= */

(function () {
  // -------- Reveal on scroll --------
  const reveals = document.querySelectorAll(".reveal");
  if (reveals.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("show");
        });
      },
      { threshold: 0.10 }
    );
    reveals.forEach((el) => io.observe(el));
  }

  // -------- Globe 3D (safe) --------
  const canvas = document.getElementById("globe-canvas");
  if (!canvas) return;

  // If THREE not loaded, stop silently
  if (typeof THREE === "undefined") return;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });

  const scene = new THREE.Scene();

  // Camera
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 4.0);

  // Lights (soft premium)
  const ambient = new THREE.AmbientLight(0xffffff, 0.65);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, 1.05);
  key.position.set(3, 2, 4);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x66ccff, 0.55);
  rim.position.set(-4, 0.5, -2);
  scene.add(rim);

  // Texture loader
  const loader = new THREE.TextureLoader();
  const earthTex = loader.load(
    "./assets/earth_night.jpg",
    () => {
      // success
    },
    undefined,
    () => {
      // If texture fails, keep a dark fallback
      console.warn("Texture globe introuvable. Vérifie /assets/earth_night.jpg");
    }
  );
  earthTex.colorSpace = THREE.SRGBColorSpace;
  earthTex.wrapS = THREE.RepeatWrapping;
  earthTex.wrapT = THREE.ClampToEdgeWrapping;
  earthTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  // Sphere geometry/material
  const geo = new THREE.SphereGeometry(1.25, 96, 96);
  const mat = new THREE.MeshStandardMaterial({
    map: earthTex,
    roughness: 0.95,
    metalness: 0.0,
  });

  const earth = new THREE.Mesh(geo, mat);
  scene.add(earth);

  // Subtle atmosphere glow (cheap + nice)
  const atmoGeo = new THREE.SphereGeometry(1.29, 96, 96);
  const atmoMat = new THREE.MeshBasicMaterial({
    color: 0x45c8ff,
    transparent: true,
    opacity: 0.08,
    side: THREE.BackSide,
  });
  const atmo = new THREE.Mesh(atmoGeo, atmoMat);
  scene.add(atmo);

  // Star-ish background specks (simple)
  // (keeps it lightweight)
  const starsGeo = new THREE.BufferGeometry();
  const starCount = 500;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 9 + Math.random() * 14;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starPos[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPos[i * 3 + 2] = r * Math.cos(phi);
  }
  starsGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const starsMat = new THREE.PointsMaterial({
    size: 0.015,
    color: 0xffffff,
    transparent: true,
    opacity: 0.35,
  });
  const stars = new THREE.Points(starsGeo, starsMat);
  scene.add(stars);

  // Resize properly (keeps perfect circle + crisp)
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    renderer.setSize(size, size, false);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  }
  window.addEventListener("resize", resize, { passive: true });
  resize();

  // Rotation control (infinite yaw + clamped pitch for comfort)
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  let yawVel = 0;
  let pitchVel = 0;

  const yawSpeed = 0.010;
  const pitchSpeed = 0.010;
  const friction = 0.92;

  // Starting nice angle
  earth.rotation.y = 1.1;
  earth.rotation.x = 0.12;

  function onDown(e) {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture?.(e.pointerId);
  }

  function onMove(e) {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    // Infinite yaw
    yawVel = dx * yawSpeed * 0.12;
    pitchVel = dy * pitchSpeed * 0.12;

    earth.rotation.y += dx * yawSpeed;
    earth.rotation.x += dy * pitchSpeed;

    // Clamp pitch (prevents flipping)
    const maxPitch = Math.PI * 0.48;
    earth.rotation.x = Math.max(-maxPitch, Math.min(maxPitch, earth.rotation.x));
  }

  function onUp() {
    dragging = false;
  }

  canvas.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerup", onUp, { passive: true });

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);

    // Auto rotate when not dragging
    if (!dragging) {
      earth.rotation.y += 0.0022;
    }

    // Inertia
    if (!dragging) {
      yawVel *= friction;
      pitchVel *= friction;
      earth.rotation.y += yawVel;
      earth.rotation.x += pitchVel;
      const maxPitch = Math.PI * 0.48;
      earth.rotation.x = Math.max(-maxPitch, Math.min(maxPitch, earth.rotation.x));
    }

    // Subtle atmo follow + stars drift
    atmo.rotation.copy(earth.rotation);
    stars.rotation.y += 0.00035;

    renderer.render(scene, camera);
  }
  animate();
})();
