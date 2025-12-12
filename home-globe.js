import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js";

const canvas = document.getElementById("globeCanvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(0, 0, 4.2);

// Lumières
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const dir = new THREE.DirectionalLight(0xffffff, 1.15);
dir.position.set(4, 2, 3);
scene.add(dir);

// Géométrie globe
const geo = new THREE.SphereGeometry(1.35, 96, 96);

const loader = new THREE.TextureLoader();
const earthMap = loader.load("./assets/earth.jpg"); // IMPORTANT: chemin relatif
earthMap.colorSpace = THREE.SRGBColorSpace;
earthMap.anisotropy = 8;

// Matériau : mesh standard (joli avec lumière)
const mat = new THREE.MeshStandardMaterial({
  map: earthMap,
  roughness: 1.0,
  metalness: 0.0
});

const globe = new THREE.Mesh(geo, mat);
scene.add(globe);

// Petit fond étoilé léger (points)
const starsGeo = new THREE.BufferGeometry();
const starCount = 900;
const positions = new Float32Array(starCount * 3);
for (let i=0;i<starCount;i++){
  const r = 18 * Math.random() + 6;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos((Math.random()*2)-1);
  positions[i*3+0] = r * Math.sin(phi) * Math.cos(theta);
  positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
  positions[i*3+2] = r * Math.cos(phi);
}
starsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
const starsMat = new THREE.PointsMaterial({ size: 0.03, opacity: 0.65, transparent:true });
const stars = new THREE.Points(starsGeo, starsMat);
scene.add(stars);

// Controls = rotation libre
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.enableZoom = false;

// ✅ IMPORTANT: pas de limite de rotation
controls.minPolarAngle = 0;
controls.maxPolarAngle = Math.PI;

// Petite auto-rotation douce quand tu ne touches pas
let userInteracting = false;
controls.addEventListener("start", () => userInteracting = true);
controls.addEventListener("end", () => userInteracting = false);

function resize(){
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width));
  const h = Math.max(1, Math.floor(rect.height));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

function tick(){
  if (!userInteracting){
    globe.rotation.y += 0.0022;
  }
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
