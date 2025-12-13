import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

const canvas = document.getElementById("globe-canvas");
if (!canvas) {
  // pas sur l'accueil => aucun impact ailleurs
  console.log("[home-globe] canvas introuvable, script ignoré.");
} else {
  const wrapper = canvas.parentElement; // .globe-card

  // ---------- utils size ----------
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  function getSize() {
    const r = wrapper.getBoundingClientRect();
    const w = Math.max(1, Math.floor(r.width));
    const h = Math.max(1, Math.floor(r.height));
    return { w, h };
  }

  function waitForSize(cb) {
    const loop = () => {
      const { w, h } = getSize();
      if (w > 10 && h > 10) cb();
      else requestAnimationFrame(loop);
    };
    loop();
  }

  waitForSize(() => {
    // ---------- scene ----------
    const scene = new THREE.Scene();

    const { w, h } = getSize();
    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
    camera.position.set(0, 0, 2.65);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // ---------- lights ----------
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));

    const dir = new THREE.DirectionalLight(0xffffff, 1.15);
    dir.position.set(4, 2.5, 6);
    scene.add(dir);

    // petite rim light pour donner du relief
    const rim = new THREE.DirectionalLight(0x6aa7ff, 0.35);
    rim.position.set(-6, -2, -4);
    scene.add(rim);

    // ---------- earth mesh ----------
    const loader = new THREE.TextureLoader();

    const earthTexture = loader.load(
      "./assets/earth.jpg",
      () => {
        renderer.render(scene, camera);
      },
      undefined,
      (e) => console.error("[home-globe] earth.jpg introuvable ou non chargeable", e)
    );

    earthTexture.colorSpace = THREE.SRGBColorSpace;
    earthTexture.anisotropy = renderer.capabilities.getMaxAnisotropy?.() || 1;

    const geometry = new THREE.SphereGeometry(1, 96, 96);
    const material = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 1,
      metalness: 0,
    });

    const earth = new THREE.Mesh(geometry, material);
    scene.add(earth);

    // ---------- interaction (drag) ----------
    let isDown = false;
    let lastX = 0;
    let lastY = 0;

    // vitesse / inertie
    let velX = 0;
    let velY = 0;

    // sensibilité
    const dragSpeed = 0.0065;

    function pointerPos(ev) {
      const rect = canvas.getBoundingClientRect();
      const x = (ev.clientX ?? 0) - rect.left;
      const y = (ev.clientY ?? 0) - rect.top;
      return { x, y };
    }

    canvas.style.cursor = "grab";

    canvas.addEventListener("pointerdown", (ev) => {
      canvas.setPointerCapture(ev.pointerId);
      isDown = true;
      const p = pointerPos(ev);
      lastX = p.x;
      lastY = p.y;
      canvas.style.cursor = "grabbing";
    });

    canvas.addEventListener("pointermove", (ev) => {
      if (!isDown) return;
      const p = pointerPos(ev);
      const dx = p.x - lastX;
      const dy = p.y - lastY;
      lastX = p.x;
      lastY = p.y;

      // rotation direct
      earth.rotation.y += dx * dragSpeed;
      earth.rotation.x += dy * dragSpeed;

      // clamp X pour pas “retourner” la planète
      earth.rotation.x = clamp(earth.rotation.x, -1.2, 1.2);

      // inertie
      velX = dx * dragSpeed;
      velY = dy * dragSpeed;
    });

    function endPointer(ev) {
      isDown = false;
      canvas.style.cursor = "grab";
      try { canvas.releasePointerCapture(ev.pointerId); } catch {}
    }

    canvas.addEventListener("pointerup", endPointer);
    canvas.addEventListener("pointercancel", endPointer);
    canvas.addEventListener("pointerleave", () => {
      isDown = false;
      canvas.style.cursor = "grab";
    });

    // ---------- resize robust ----------
    function resize() {
      const { w, h } = getSize();
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    const ro = new ResizeObserver(() => resize());
    ro.observe(wrapper);
    window.addEventListener("resize", resize);

    // ---------- render loop ----------
    function animate() {
      requestAnimationFrame(animate);

      // si pas en drag, on applique l’inertie (et on la freine)
      if (!isDown) {
        earth.rotation.y += velX;
        earth.rotation.x += velY;
        earth.rotation.x = clamp(earth.rotation.x, -1.2, 1.2);

        velX *= 0.92;
        velY *= 0.92;

        // petit mouvement très léger “vivant” (mais pas de rotation auto visible)
        velX += 0.00002;
      }

      renderer.render(scene, camera);
    }

    animate();

    console.log("[home-globe] OK: globe interactif actif (drag souris).");
  });
}
