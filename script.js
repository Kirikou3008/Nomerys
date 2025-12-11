// ---- Navigation active ----
(function setActiveNav() {
  const path = window.location.pathname.split("/").pop() || "index.html";
  const links = document.querySelectorAll(".main-nav .nav-link");
  links.forEach((link) => {
    const href = link.getAttribute("href");
    if (
      (path === "" && href === "index.html") ||
      (path === "index.html" && href === "index.html") ||
      href === path
    ) {
      link.classList.add("nav-link-active");
    } else {
      link.classList.remove("nav-link-active");
    }
  });
})();

// ---- Globe 3D Earth ----
(function initEarth() {
  const canvas = document.getElementById("earthCanvas");
  if (!canvas || typeof THREE === "undefined") return;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.z = 3.2;

  // 💡 Lumière plus douce + plus d'ambiance
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.7); // avant 1.2
  dirLight.position.set(4, 3, 5);
  scene.add(dirLight);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x111122, 0.6);
  scene.add(hemiLight);

  const ambient = new THREE.AmbientLight(0xffffff, 0.45); // avant 0.35
  scene.add(ambient);

  // Géométrie Terre
  const geometry = new THREE.SphereGeometry(1, 64, 64);
  const loader = new THREE.TextureLoader();
  const earthTexture = loader.load("assets/earth.jpg", () => {
    renderOnce();
  });

  // 🌍 Matériau un peu brillant, sans trop d’ombre ultra dure
  const material = new THREE.MeshPhongMaterial({
    map: earthTexture,
    shininess: 8,
  });

  const earth = new THREE.Mesh(geometry, material);
  scene.add(earth);

  function resizeRenderer() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight || width;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  window.addEventListener("resize", resizeRenderer);
  resizeRenderer();

  let targetRotationX = 0;
  let targetRotationY = 0;

  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    targetRotationY = x * 1.2;
    targetRotationX = -y * 0.8;
  }

  canvas.addEventListener("mousemove", onMouseMove);

  function renderOnce() {
    renderer.render(scene, camera);
  }

  function animate() {
    requestAnimationFrame(animate);

    earth.rotation.y += 0.002;
    earth.rotation.x += (targetRotationX - earth.rotation.x) * 0.05;
    earth.rotation.y += (targetRotationY - earth.rotation.y) * 0.05;

    renderer.render(scene, camera);
  }

  animate();
})();
