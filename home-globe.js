// home-globe.js (ES module)
// Globe 3D interactif (drag souris) + texture /assets/earth.jpg

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/controls/OrbitControls.js";

const canvas = document.getElementById("globeCanvas");

// Sécurité : si canvas absent, on ne fait rien
if (!canvas) {
  console.warn("[home-globe] canvas #globeCanvas introuvable.");
} else {
  const scene = new THREE.Scene();

  // Camera
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 3.0);

  // Renderer
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);

  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(3, 2, 4);
  scene.add(dir);

  // Globe mesh
  const geometry = new THREE.SphereGeometry(1, 64, 64);

  // Texture loader
  const loader = new THREE.TextureLoader();

  // IMPORTANT : ton image doit être ici:
  // /assets/earth.jpg
  const earthTexture = loader.load(
    "./assets/earth.jpg",
    () => {
      // ok loaded
    },
    undefined,
    (err) => {
      console.error("[home-globe] Erreur texture earth.jpg:", err);
    }
  );

  earthTexture.colorSpace = THREE.SRGBColorSpace;
  earthTexture.anisotropy = 8;

  const material = new THREE.MeshStandardMaterial({
    map: earthTexture,
    roughness: 0.95,
    metalness: 0.0,
  });

  const globe = new THREE.Mesh(geometry, material);
  scene.add(globe);

  // Petit “halo” discret (optionnel mais joli)
  const glowGeo = new THREE.SphereGeometry(1.02, 64, 64);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x2f7bff,
    transparent: true,
    opacity: 0.08,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  scene.add(glow);

  // Controls: rotation à la souris (drag)
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableZoom = false; // pour éviter le zoom qui casse le layout
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;

  // On limite l'orbite pour rester “face” au globe et éviter de passer derrière
  controls.minPolarAngle = Math.PI * 0.25;
  controls.maxPolarAngle = Math.PI * 0.75;

  // Auto-rotation très légère (tu peux mettre false si tu veux 100% manuel)
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.35;

  // Petit effet “suivi” au mouvement de souris (pas un drag, juste un tilt)
  let mouseX = 0;
  let mouseY = 0;

  function onMouseMove(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width; // 0..1
    const y = (e.clientY - rect.top) / rect.height; // 0..1

    // -0.5..0.5
    mouseX = x - 0.5;
    mouseY = y - 0.5;
  }

  renderer.domElement.addEventListener("mousemove", onMouseMove);

  // Resize
  function resize() {
    const parent = renderer.domElement.parentElement;
    const w = parent.clientWidth;
    const h = parent.clientHeight;

    renderer.setSize(w, h, false);

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // Animation
  function animate() {
    // Tilt léger (n’empêche PAS le drag)
    // On applique un petit offset sur le mesh (pas sur la caméra) pour garder un effet subtil.
    const targetTiltX = mouseY * 0.18; // vertical
    const targetTiltY = mouseX * 0.22; // horizontal

    globe.rotation.x += (targetTiltX - globe.rotation.x) * 0.02;
    // rotation.y est aussi pilotée par OrbitControls, donc on fait un petit add
    globe.rotation.y += (targetTiltY - 0) * 0.002;

    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  // Observers
  const ro = new ResizeObserver(() => resize());
  ro.observe(renderer.domElement.parentElement);

  resize();
  animate();
}
