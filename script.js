// script.js

document.addEventListener("DOMContentLoaded", () => {
  /* --------- Smooth scroll sur les ancres internes --------- */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const targetId = link.getAttribute("href");
      if (!targetId || targetId === "#") return;

      const target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();
      const y = target.getBoundingClientRect().top + window.scrollY - 80;

      window.scrollTo({
        top: y,
        behavior: "smooth",
      });
    });
  });

  /* --------- Reveal sections --------- */
  const revealElements = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealElements.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );

    revealElements.forEach((el) => observer.observe(el));
  } else {
    revealElements.forEach((el) => el.classList.add("visible"));
  }

  /* --------- Avion qui s'anime sur la section À propos --------- */
  const plane = document.querySelector(".scroll-plane");
  const aboutSection = document.querySelector("#about");

  if (plane && aboutSection && "IntersectionObserver" in window) {
    const planeObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            plane.classList.add("animate");
            planeObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );

    planeObserver.observe(aboutSection);
  }

  /* --------- Mini-form : on bloque le submit réel pour l'instant --------- */
  const miniForm = document.querySelector(".mini-form form");
  if (miniForm) {
    miniForm.addEventListener("submit", (e) => {
      e.preventDefault();
      alert(
        "Merci ! Quand tu voudras, tu pourras connecter ce formulaire à n8n / Zapier pour recevoir les projets automatiquement."
      );
    });
  }

  /* =========================================================
     TERRE 3D AVEC THREE.JS
     ========================================================= */

  const canvas = document.getElementById("earth-canvas");
  const wrapper = document.querySelector(".hero-planet-wrapper");

  if (canvas && wrapper && window.THREE) {
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      35,
      wrapper.clientWidth / wrapper.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 3.2);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(wrapper.clientWidth, wrapper.clientHeight);

    // Lumières
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(3, 2, 3);
    scene.add(dirLight);

    // Terre
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load("assets/earth.jpg");

    const material = new THREE.MeshPhongMaterial({
      map: texture,
      shininess: 12,
    });

    const earth = new THREE.Mesh(geometry, material);
    scene.add(earth);

    // Léger halo autour
    const glowGeometry = new THREE.SphereGeometry(1.05, 64, 64);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x1d4ed8,
      transparent: true,
      opacity: 0.45,
      side: THREE.BackSide,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    scene.add(glow);

    // Rotation automatique + drag souris
    let autoRotate = true;
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    function onPointerDown(e) {
      isDragging = true;
      autoRotate = false;
      const point = e.touches ? e.touches[0] : e;
      prevX = point.clientX;
      prevY = point.clientY;
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      const point = e.touches ? e.touches[0] : e;
      const deltaX = point.clientX - prevX;
      const deltaY = point.clientY - prevY;
      prevX = point.clientX;
      prevY = point.clientY;

      const rotSpeed = 0.005;
      earth.rotation.y += deltaX * rotSpeed;
      earth.rotation.x += deltaY * rotSpeed;
      earth.rotation.x = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, earth.rotation.x)
      );
    }

    function onPointerUp() {
      isDragging = false;
      autoRotate = true;
    }

    wrapper.addEventListener("mousedown", onPointerDown);
    wrapper.addEventListener("mousemove", onPointerMove);
    wrapper.addEventListener("mouseup", onPointerUp);
    wrapper.addEventListener("mouseleave", onPointerUp);

    wrapper.addEventListener("touchstart", onPointerDown, { passive: true });
    wrapper.addEventListener("touchmove", onPointerMove, { passive: true });
    wrapper.addEventListener("touchend", onPointerUp);

    // Resize
    window.addEventListener("resize", () => {
      const w = wrapper.clientWidth;
      const h = wrapper.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });

    // Animation
    function animate() {
      requestAnimationFrame(animate);
      if (autoRotate) {
        earth.rotation.y += 0.0009 * 60 / 60; // rotation douce
      }
      renderer.render(scene, camera);
    }

    animate();
  }
});
