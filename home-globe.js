import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/controls/OrbitControls.js";

const canvas = document.getElementById("globe-canvas");
if (!canvas) {
  // Pas sur la page d'accueil => on ne fait rien.
  console.log("[globe] canvas introuvable, script ignoré.");
} else {
  const wrapper = canvas.closest(".globe-wrapper") || canvas.parentElement;

  // ---- SIZING ROBUSTE ----
  function getSize() {
    const r = wrapper.getBoundingClientRect();
    const w = Math.max(1, Math.floor(r.width));
    const h = Math.max(1, Math.floor(r.height));
    return { w, h };
  }

  // On attend que le layout soit prêt (très important sur GitHub Pages + fonts)
  function waitForNonZeroSize(cb) {
    const tick = () => {
      const { w, h } = getSize();
      if (w > 10 && h > 10) cb();
      else requestAnimationFrame(tick);
    };
    tick();
  }

  waitForNonZeroSize(() => {
    // ---- SCÈNE ----
    const scene = new THREE.Scene();

    // ---- CAMÉRA ----
    const { w, h } = getSize();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(0, 0, 2.8);

    // ---- RENDERER ----
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // ---- LUMIÈRES ----
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));

    const dir = new THREE.DirectionalLight(0xffffff, 1.15);
    dir.position.set(5, 2.5, 5);
    scene.add(dir);

    // ---- TEXTURE ----
    const loader = new THREE.TextureLoader();
    const earthTexture = loader.load(
      "./assets/earth.jpg",
      () => {
        // une fois la texture chargée, on force un rendu immédiat
        renderer.render(scene, camera);
      },
      undefined,
      (err) => {
        console.error("[globe] Erreur chargement texture earth.jpg", err);
      }
    );
    earthTexture.colorSpace = THREE.SRGBColorSpace;

    // ---- SPHÈRE ----
    const geo = new THREE.SphereGeometry(1, 96, 96);
    const mat = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 1,
      metalness: 0,
    });

    const earth = new THREE.Mesh(geo, mat);
    scene.add(earth);

    // ---- CONTROLS (SOURIS) ----
    const controls = new OrbitControls(camera, renderer.domElement);

    // Rotation à la souris
    controls.enableRotate = true;

    // On bloque tout ce que tu ne veux pas
    controls.enableZoom = false;
    controls.enablePan = false;

    // Douceur
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.rotateSpeed = 0.9;

    // IMPORTANT : pas de rotation auto
    controls.autoRotate = false;

    // Optionnel : on évite de pouvoir retourner la caméra “à l’envers”
    controls.minPolarAngle = 0.25;
    controls.maxPolarAngle = Math.PI - 0.25;

    // ---- RESIZE (SUPER ROBUSTE) ----
    function resize() {
      const { w, h } = getSize();
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    // ResizeObserver (mieux que window resize si ton layout change)
    const ro = new ResizeObserver(() => resize());
    ro.observe(wrapper);

    window.addEventListener("resize", resize);

    // ---- LOOP ----
    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    console.log("[globe] OK (Three.js + OrbitControls) rendu actif.");
  });
}
