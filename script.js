document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('earthCanvas');
  const heroPlanet = document.querySelector('.hero-planet');

  // Si on n'est pas sur la page d'accueil (pas de planète), on arrête là
  if (!canvas || !heroPlanet) {
    return;
  }

  // --- à partir d'ici, tu mets tout ton code Three.js comme avant ---
  // création de la scène, caméra, renderer, sphère, texture, etc.
});

const camera = new THREE.PerspectiveCamera(
  35,
  canvas.clientWidth / canvas.clientHeight,
  0.1,
  100
);
camera.position.set(0, 0, 6);

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

// ---------- LUMIÈRES ----------
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(5, 3, 5);
scene.add(dirLight);

// ---------- TERRE ----------
const textureLoader = new THREE.TextureLoader();

// mets ici le BON chemin vers ta texture
// ex: "assets/earth_night_4k.jpg"
const earthTexture = textureLoader.load("assets/earth_night_4k.jpg");

const earthGeometry = new THREE.SphereGeometry(1.8, 64, 64);
const earthMaterial = new THREE.MeshStandardMaterial({
  map: earthTexture,
  roughness: 1,
  metalness: 0,
});

const earth = new THREE.Mesh(earthGeometry, earthMaterial);

// règle l'orientation de départ (plus de continents, moins de Pacifique)
earth.rotation.y = -Math.PI * 0.6; // teste -0.6, -0.8, etc. jusqu'à ce que tu aimes
scene.add(earth);

// ---------- GLOW BLEU AUTOUR ----------
const glowGeometry = new THREE.SphereGeometry(2.1, 64, 64);
const glowMaterial = new THREE.MeshBasicMaterial({
  color: 0x1b4fff,
  transparent: true,
  opacity: 0.9,
});
const glow = new THREE.Mesh(glowGeometry, glowMaterial);
scene.add(glow);

// ---------- ROTATION : AUTO + DRAG ILLIMITÉ ----------

// rotation cible (on anime la vraie rotation vers celle-ci)
let targetRotation = {
  x: earth.rotation.x,
  y: earth.rotation.y,
};

let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

// petite auto-rotation quand on ne touche pas à la souris
const AUTO_ROTATION_SPEED = 0.002;
const DRAG_SPEED = 0.005;

canvas.addEventListener("mousedown", (event) => {
  isDragging = true;
  previousMousePosition.x = event.clientX;
  previousMousePosition.y = event.clientY;
});

window.addEventListener("mouseup", () => {
  isDragging = false;
});

window.addEventListener("mousemove", (event) => {
  if (!isDragging) return;

  const deltaX = event.clientX - previousMousePosition.x;
  const deltaY = event.clientY - previousMousePosition.y;

  // on ajoute au lieu de recaler : rotation infinie possible
  targetRotation.y += deltaX * DRAG_SPEED;
  targetRotation.x += deltaY * DRAG_SPEED;

  // on limite juste en haut / bas pour ne pas retourner totalement la Terre
  const maxTilt = Math.PI / 2.2;
  targetRotation.x = Math.max(-maxTilt, Math.min(maxTilt, targetRotation.x));

  previousMousePosition.x = event.clientX;
  previousMousePosition.y = event.clientY;
});

// ---------- ANIMATION ----------
function animate() {
  requestAnimationFrame(animate);

  // auto rotation quand on ne drag pas
  if (!isDragging) {
    targetRotation.y += AUTO_ROTATION_SPEED;
  }

  // interpolation douce vers la rotation cible
  earth.rotation.y += (targetRotation.y - earth.rotation.y) * 0.1;
  earth.rotation.x += (targetRotation.x - earth.rotation.x) * 0.1;

  glow.rotation.copy(earth.rotation);

  renderer.render(scene, camera);
}

animate();

// ---------- RESIZE ----------
window.addEventListener("resize", () => {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height, false);
});
