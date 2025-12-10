// === PLANÈTE 3D AVEC THREE.JS ===

let scene, camera, renderer, globe, controls;

function initGlobe() {
  const container = document.getElementById("globe-container");
  if (!container) return;

  const width = container.clientWidth;
  const height = container.clientHeight;

  // Scène
  scene = new THREE.Scene();

  // Caméra
  camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
  camera.position.set(0, 0, 6);

  // Rendu
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  container.appendChild(renderer.domElement);

  // Lumières
  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambient);

  const directional = new THREE.DirectionalLight(0xffffff, 1.2);
  directional.position.set(3, 3, 5);
  scene.add(directional);

  // Géométrie de la sphère (la Terre)
  const geometry = new THREE.SphereGeometry(2, 64, 64);

  const textureLoader = new THREE.TextureLoader();
  // IMPORTANT : mets bien ton image ici, par ex. /assets/earth.jpg
  const earthTexture = textureLoader.load("assets/earth.jpg");

  const material = new THREE.MeshStandardMaterial({
    map: earthTexture,
    roughness: 0.7,
    metalness: 0.0
  });

  globe = new THREE.Mesh(geometry, material);
  scene.add(globe);

  // Contrôles souris : rotation avec drag, sans zoom ni pan
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.rotateSpeed = 0.7;
  controls.dampingFactor = 0.08;
  controls.enableDamping = true;

  // Légère rotation automatique
  function animate() {
    requestAnimationFrame(animate);

    // rotation automatique très lente
    if (globe) {
      globe.rotation.y += 0.0008;
    }

    controls.update();
    renderer.render(scene, camera);
  }

  animate();

  // Resize
  window.addEventListener("resize", () => onWindowResize(container), false);
}

function onWindowResize(container) {
  if (!renderer || !camera) return;

  const width = container.clientWidth;
  const height = container.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

// Lance l’init quand la page est chargée
window.addEventListener("DOMContentLoaded", initGlobe);
