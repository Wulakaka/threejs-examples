import * as THREE from "three";
import "./style.css";
import { ButterflyGeometry } from "./models/ButterflyGeometry";
import { OrbitControls } from "three/examples/jsm/Addons.js";

let last = performance.now();
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

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera);
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);
  controls.connect(renderer.domElement);

  function animate() {
    const now = performance.now();
    let delta = now - last;
    if (delta > 1) {
      delta = 1;
    }
    controls.update();
    renderer.render(scene, camera);
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }
}

init();
