const container = document.getElementById("globe-container");
if (!container) console.warn("globe-container introuvable");

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45,
  container.clientWidth / container.clientHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 3);

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// Texture
const texture = new THREE.TextureLoader().load("assets/earth.jpg");

// Globe
const geometry = new THREE.SphereGeometry(1, 96, 96);
const material = new THREE.MeshPhongMaterial({
  map: texture,
  shininess: 8,
  specular: new THREE.Color(0x222222),
});
const globe = new THREE.Mesh(geometry, material);
scene.add(globe);

// Lumières
const keyLight = new THREE.DirectionalLight(0xffffff, 1.05);
keyLight.position.set(4, 2, 4);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x9bd7ff, 0.35);
fillLight.position.set(-4, -2, 2);
scene.add(fillLight);

const ambient = new THREE.AmbientLight(0xffffff, 0.25);
scene.add(ambient);

// Controls (rotation souris)
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;

controls.enableZoom = false;  // pas de zoom molette
controls.enablePan = false;   // pas de déplacement
controls.rotateSpeed = 0.8;

// Auto-rotate mais se coupe quand tu touches
controls.autoRotate = true;
controls.autoRotateSpeed = 0.55;

let resumeTimer = null;
renderer.domElement.addEventListener("pointerdown", () => {
  controls.autoRotate = false;
  if (resumeTimer) clearTimeout(resumeTimer);
});

renderer.domElement.addEventListener("pointerup", () => {
  if (resumeTimer) clearTimeout(resumeTimer);
  resumeTimer = setTimeout(() => {
    controls.autoRotate = true;
  }, 1200);
});

// Animation
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// Resize
function resize() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener("resize", resize);
resize();
