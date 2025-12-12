// home-globe.js
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js";

const canvas = document.getElementById("globeCanvas");
if (!canvas) {
  console.warn("[Globe] canvas #globeCanvas introuvable.");
} else {
  // SCENE
  const scene = new THREE.Scene();

  // CAMERA
  const camera = new THREE.PerspectiveCamera(
    45,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 3.2);

  // RENDERER
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

  // IMPORTANT (couleurs correctes)
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // LIGHTS
  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);

  const dir = new THREE.DirectionalLight(0xffffff, 1.15);
  dir.position.set(2.5, 1.2, 2.0);
  scene.add(dir);

  // SPHERE
  const geometry = new THREE.SphereGeometry(1, 64, 64);

  // Matériau par défaut (bleu) → sera remplacé par la texture si elle charge
  const material = new THREE.MeshStandardMaterial({
    color: 0x2a7cff,
    roughness: 1.0,
    metalness: 0.0,
  });

  const globe = new THREE.Mesh(geometry, material);
  scene.add(globe);

  // TEXTURE LOADER
  const loader = new THREE.TextureLoader();
  // si tu utilises parfois des URLs externes : loader.crossOrigin = "anonymous";

  const texturePath = "assets/earth.jpg"; // <<< CHEMIN IMPORTANT
  loader.load(
    texturePath,
    (tex) => {
      // Couleurs correctes
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

      material.map = tex;
      material.color.set(0xffffff); // enlève la teinte bleue
      material.needsUpdate = true;

      console.log("[Globe] Texture chargée OK :", texturePath);
    },
    undefined,
    (err) => {
      console.error("[Globe] ERREUR chargement texture :", texturePath, err);
      console.error(
        "➡️ Vérifie que le fichier existe exactement ici: /assets/earth.jpg (même orthographe/majuscules)."
      );
    }
  );

  // CONTROLS (rotation illimitée)
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  controls.enablePan = false;
  controls.enableZoom = false;

  // Ne PAS mettre min/maxAzimuthAngle → sinon ça bloque la rotation
  // controls.minAzimuthAngle = -Infinity; // inutile
  // controls.maxAzimuthAngle = Infinity;  // inutile

  // Tu peux limiter juste le haut/bas si tu veux éviter de retourner la planète :
  controls.minPolarAngle = 0.15;
  controls.maxPolarAngle = Math.PI - 0.15;

  // Petite rotation auto "wow" + l'utilisateur peut reprendre à la souris
  let autoRotate = true;
  controls.addEventListener("start", () => (autoRotate = false));
  controls.addEventListener("end", () => (autoRotate = true));

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);

  // ANIMATE
  function animate() {
    requestAnimationFrame(animate);

    if (autoRotate) globe.rotation.y += 0.0022;

    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}
