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

  // Lumières
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(5, 5, 5);
  scene.add(dirLight);

  const ambient = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambient);

  // Géométrie Terre
  const geometry = new THREE.SphereGeometry(1, 64, 64);
  const loader = new THREE.TextureLoader();
  const earthTexture = loader.load("assets/earth.jpg", () => {
    renderOnce();
  });

  const material = new THREE.MeshStandardMaterial({
    map: earthTexture,
  });

  const earth = new THREE.Mesh(geometry, material);
  scene.add(earth);

  // Taille / ratio
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

  // Interaction souris
  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    targetRotationY = x * 1.2; // gauche/droite
    targetRotationX = -y * 0.8; // haut/bas
  }

  canvas.addEventListener("mousemove", onMouseMove);

  function renderOnce() {
    renderer.render(scene, camera);
  }

  // Animation
  function animate() {
    requestAnimationFrame(animate);

    // rotation de base
    earth.rotation.y += 0.002;

    // easing vers la position de la souris
    earth.rotation.x += (targetRotationX - earth.rotation.x) * 0.05;
    earth.rotation.y += (targetRotationY - earth.rotation.y) * 0.05;

    renderer.render(scene, camera);
  }

  animate();
})();
