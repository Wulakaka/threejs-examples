import * as THREE from "three";
import "./style.css";
import { ButterflyGeometry } from "./models/ButterflyGeometry";
import { OrbitControls } from "three/examples/jsm/Addons.js";

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 5;

  const scene = new THREE.Scene();

  window.addEventListener("resize", onWindowResize, false);

  const geometry = new ButterflyGeometry();
  const material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // 鼠标移动
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera);
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);
  controls.connect(renderer.domElement);

  container.style.touchAction = "none";
  container.addEventListener("pointermove", onPointerMove);

  function animate() {
    render();
  }

  let last = performance.now();

  function render() {
    const now = performance.now();
    let delta = now - last;
    if (delta > 1) {
      delta = 1;
    }
    last = now;
    controls.update();

    raycaster.setFromCamera(pointer, camera);
    // console.log(raycaster.ray.origin, raycaster.ray.direction);

    renderer.render(scene, camera);
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  function onPointerMove(event: PointerEvent) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
  }
}

init();
