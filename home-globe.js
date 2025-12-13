import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/controls/OrbitControls.js";

const canvas = document.getElementById("globe-canvas");

// SCÈNE
const scene = new THREE.Scene();

// CAMÉRA
const camera = new THREE.PerspectiveCamera(
  45,
  canvas.clientWidth / canvas.clientHeight,
  0.1,
  1000
);
camera.position.z = 3;

// RENDERER
const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true
});
renderer.setSize(canvas.clientWidth, canvas.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// LUMIÈRES
scene.add(new THREE.AmbientLight(0xffffff, 0.9));

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 3, 5);
scene.add(directionalLight);

// TEXTURE TERRE
const textureLoader = new THREE.TextureLoader();
const earthTexture = textureLoader.load("assets/earth.jpg");

// SPHÈRE
const earthGeometry = new THREE.SphereGeometry(1, 64, 64);
const earthMaterial = new THREE.MeshStandardMaterial({
  map: earthTexture
});

const earth = new THREE.Mesh(earthGeometry, earthMaterial);
scene.add(earth);

// CONTROLS = ROTATION À LA SOURIS
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = false;
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.rotateSpeed = 0.8;
controls.autoRotate = false; // 👈 IMPORTANT

// ANIMATION
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();

// RESPONSIVE
window.addEventListener("resize", () => {
  const size = canvas.clientWidth;
  renderer.setSize(size, size);
  camera.aspect = 1;
  camera.updateProjectionMatrix();
});
