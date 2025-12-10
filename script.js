// === PLANÈTE 3D AVEC HALO + CONTRÔLE SOURIS ===

let scene, camera, renderer, globe, glowMesh, controls;

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

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  container.appendChild(renderer.domElement);

  // Lumières
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);

  const directional = new THREE.DirectionalLight(0xffffff, 1.2);
  directional.position.set(3, 3, 5);
  scene.add(directional);

  // Géométrie de la Terre
  const geometry = new THREE.SphereGeometry(2, 64, 64);
  const textureLoader = new THREE.TextureLoader();

  // IMPORTANT : chemin vers ton image (assets/earth.jpg)
  const earthTexture = textureLoader.load("assets/earth.jpg");

  const earthMaterial = new THREE.MeshStandardMaterial({
    map: earthTexture,
    roughness: 0.8,
    metalness: 0.0,
    // Les lumières de ville ressortent mieux avec emissive
    emissive: new THREE.Color(0xffffff),
    emissiveMap: earthTexture,
    emissiveIntensity: 0.4
  });

  globe = new THREE.Mesh(geometry, earthMaterial);
  scene.add(globe);

  // Halo autour de la planète (lueur douce)
  const glowGeometry = new THREE.SphereGeometry(2.25, 64, 64);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0x60a5fa),
    transparent: true,
    opacity: 0.35
  });
  glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
  scene.add(glowMesh);

  // Contrôles souris
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.rotateSpeed = 0.7;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  // Animation
  function animate() {
    requestAnimationFrame(animate);

    // Rotation auto très légère
    if (globe) {
      globe.rotation.y += 0.0008;
    }

    controls.update();
    renderer.render(scene, camera);
  }

  animate();

  // Resize
  window.addEventListener("resize", () => onWindowResize(container));
}

function onWindowResize(container) {
  if (!renderer || !camera) return;

  const width = container.clientWidth;
  const height = container.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

window.addEventListener("DOMContentLoaded", initGlobe);
