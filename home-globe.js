import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/controls/OrbitControls.js";

const canvas = document.getElementById("globeCanvas");

// sécurité si canvas absent
if (!canvas) {
  console.warn("globeCanvas introuvable");
} else {
  const scene = new THREE.Scene();

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance"
  });

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.set(0, 0, 2.75);

  // Globe
  const geometry = new THREE.SphereGeometry(1, 96, 96);

  // ⚠️ Chemin texture : IMPORTANT pour GitHub Pages
  const textureUrl = "./assets/earth.jpg";

  const loader = new THREE.TextureLoader();
  const earthTexture = loader.load(
    textureUrl,
    () => {},
    undefined,
    (err) => {
      console.error("Texture non chargée:", textureUrl, err);
    }
  );

  earthTexture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.MeshStandardMaterial({
    map: earthTexture,
    roughness: 0.95,
    metalness: 0.05
  });

  const globe = new THREE.Mesh(geometry, material);
  scene.add(globe);

  // Lights (rendu réaliste)
  const ambient = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(3.5, 2.0, 2.8);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x66ccff, 0.5);
  rim.position.set(-3.5, -2.0, -2.8);
  scene.add(rim);

  // Controls : rotation LIBRE à la souris (comme tu veux)
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.rotateSpeed = 0.6;

  // IMPORTANT : pas de limite => tourne à l'infini
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;

  // Auto-rotation douce quand tu ne touches pas
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.35;

  // Resize fiable (canvas CSS -> pixels)
  function resizeRendererToDisplaySize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize =
      canvas.width !== Math.floor(width * window.devicePixelRatio) ||
      canvas.height !== Math.floor(height * window.devicePixelRatio);

    if (needResize) {
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
  }

  // Animation loop
  function animate() {
    resizeRendererToDisplaySize();
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();
}
