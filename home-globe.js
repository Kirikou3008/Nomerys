// ===========================
// HOME GLOBE (index seulement)
// ===========================

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const canvas = document.getElementById("earthCanvas");
if (!canvas) {
  // Sécurité: si on n'est pas sur l'accueil, on quitte
  throw new Error("earthCanvas not found (not on home).");
}

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Scene / Camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(0, 0, 4.2);

// Lights (soft)
const key = new THREE.DirectionalLight(0xffffff, 1.0);
key.position.set(3, 2, 4);
scene.add(key);

const fill = new THREE.DirectionalLight(0x88aaff, 0.45);
fill.position.set(-4, -2, 2);
scene.add(fill);

const amb = new THREE.AmbientLight(0x5577aa, 0.20);
scene.add(amb);

// Globe geometry
const geometry = new THREE.SphereGeometry(1.35, 64, 64);

// Material with texture
const loader = new THREE.TextureLoader();
loader.setCrossOrigin("anonymous");

const material = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.95,
  metalness: 0.0,
});

const globe = new THREE.Mesh(geometry, material);
scene.add(globe);

// Optional atmosphere (subtle)
const atmGeo = new THREE.SphereGeometry(1.38, 64, 64);
const atmMat = new THREE.MeshBasicMaterial({
  color: 0x3bd6ff,
  transparent: true,
  opacity: 0.08,
});
const atmosphere = new THREE.Mesh(atmGeo, atmMat);
scene.add(atmosphere);

// Load texture
loader.load(
  "../assets/earth.jpg", // IMPORTANT: index.html is at root, JS is in /js, so ../assets works from JS module
  (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    material.map = tex;
    material.needsUpdate = true;
  },
  undefined,
  () => {
    // fallback if texture fails
    material.color = new THREE.Color(0x2046ff);
    material.needsUpdate = true;
  }
);

// Resize helper
function resize() {
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width));
  const h = Math.max(1, Math.floor(rect.height));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener("resize", resize);

// Rotation controls (free, no hard stop)
let isDown = false;
let lastX = 0, lastY = 0;
let velX = 0, velY = 0;

const ROT_SPEED = 0.006;       // mouse sensitivity
const INERTIA = 0.94;          // inertia damping
const AUTO_ROT = 0.0012;       // slow auto rotate when idle
const MAX_PITCH = Math.PI/2 - 0.08; // avoid flipping (still feels free)

canvas.style.cursor = "grab";

canvas.addEventListener("pointerdown", (e) => {
  isDown = true;
  canvas.setPointerCapture(e.pointerId);
  lastX = e.clientX;
  lastY = e.clientY;
  velX = 0; velY = 0;
  canvas.style.cursor = "grabbing";
});

canvas.addEventListener("pointermove", (e) => {
  if (!isDown) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;

  const ry = dx * ROT_SPEED;
  const rx = dy * ROT_SPEED;

  globe.rotation.y += ry;
  globe.rotation.x += rx;

  // Clamp only on X to avoid upside-down weirdness
  globe.rotation.x = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, globe.rotation.x));

  // track velocity for inertia
  velX = ry;
  velY = rx;
});

function endDrag(e){
  isDown = false;
  canvas.style.cursor = "grab";
}
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);
canvas.addEventListener("pointerleave", endDrag);

// Animate loop
function animate() {
  requestAnimationFrame(animate);

  if (!isDown) {
    // auto rotate + inertia
    globe.rotation.y += AUTO_ROT + velX;
    globe.rotation.x += velY;

    globe.rotation.x = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, globe.rotation.x));

    velX *= INERTIA;
    velY *= INERTIA;
  }

  atmosphere.rotation.copy(globe.rotation);

  renderer.render(scene, camera);
}
animate();
