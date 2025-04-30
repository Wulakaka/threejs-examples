import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import "./style.css";
import { add, positionLocal, sub, varying, vec4 } from "three/tsl";

// 可以动态创建，也可以直接使用html中的canvas元素
let container: HTMLDivElement;

let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let renderer: THREE.WebGPURenderer;

let last = performance.now();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    5000
  );
  camera.position.z = 1000;

  scene = new THREE.Scene();
  // fog 为了天空呈现泛白的效果
  scene.fog = new THREE.Fog(0xffffff, 700, 3000);

  // Sky
  {
    // 半径为 1 为了归一化
    const geometry = new THREE.IcosahedronGeometry(1, 6);
    const material = new THREE.MeshBasicNodeMaterial({
      colorNode: varying(
        vec4(
          sub(0.25, positionLocal.y),
          sub(-0.25, positionLocal.y),
          add(1.5, positionLocal.y),
          1.0
        )
      ),
      side: THREE.BackSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.z = 0.75;
    mesh.scale.setScalar(1200);
    scene.add(mesh);
  }

  renderer = new THREE.WebGPURenderer({ antialias: true, forceWebGL: false });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.toneMapping = THREE.NeutralToneMapping;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera);
  controls.connect(renderer.domElement);
}

function animate() {
  render();
  renderer.resolveTimestampsAsync();
  // stats.update();
}

function render() {
  const now = performance.now();
  let deltaTime = (now - last) / 1000;

  if (deltaTime > 1) deltaTime = 1; // safety cap on large deltas
  last = now;

  renderer.resolveTimestampsAsync(THREE.TimestampQuery.COMPUTE);
  renderer.render(scene, camera);
}

init();
