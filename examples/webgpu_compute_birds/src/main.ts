import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { add, positionLocal, sub, varying, vec4 } from "three/tsl";
import Stats from "stats-gl";
import "./style.css";

// 可以动态创建，也可以直接使用html中的canvas元素
let container: HTMLDivElement;
let stats: Stats;

let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let renderer: THREE.WebGPURenderer;

let last = performance.now();

let pointer: THREE.Vector2;
let raycaster: THREE.Raycaster;

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

  // Pointer
  pointer = new THREE.Vector2();
  raycaster = new THREE.Raycaster();

  // Sky
  function addSky() {
    // 半径为 1 为了 position 从 -1 到 1
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
    // mesh.scale.setScalar(500);
    scene.add(mesh);
  }

  addSky();

  renderer = new THREE.WebGPURenderer({ antialias: true, forceWebGL: false });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.toneMapping = THREE.NeutralToneMapping;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera);
  controls.connect(renderer.domElement);

  // stats
  {
    stats = new Stats({
      precision: 3,
      horizontal: false,
      trackGPU: true,
      trackCPT: true,
    });

    stats.init(renderer);
    container.appendChild(stats.dom);
  }

  {
    // 避免在移动端上手指滑动时，页面滚动
    container.style.touchAction = "none";
    container.addEventListener("pointermove", onPointerMove);
  }
}

function onPointerMove(event: PointerEvent) {
  // 为了避免多点触控时，pointer 的值被覆盖
  if (event.isPrimary === false) return;

  // [x, y] 的值范围是 [-1, 1]
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  // 由于 y 轴在 threejs 中是向上的，所以需要取反
  pointer.y = 1 - (event.clientY / window.innerHeight) * 2;
}

function animate() {
  render();
  renderer.resolveTimestampsAsync();
  stats.update();
}

function render() {
  const now = performance.now();
  let deltaTime = (now - last) / 1000;

  if (deltaTime > 1) deltaTime = 1; // safety cap on large deltas
  last = now;

  raycaster.setFromCamera(pointer, camera);
  console.log(raycaster.ray.origin, raycaster.ray.direction);

  renderer.resolveTimestampsAsync(THREE.TimestampQuery.COMPUTE);
  renderer.render(scene, camera);
}

init();
