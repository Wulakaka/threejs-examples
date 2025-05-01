import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import "./style.css";
import positionVertexShader from "@/shaders/position/vertex.glsl?raw";
import positionFragmentShader from "@/shaders/position/fragment.glsl?raw";

// 可以动态创建，也可以直接使用html中的canvas元素
let container: HTMLDivElement;
let controls: OrbitControls;
// let stats: Stats;

let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;

let last = performance.now();

let pointer: THREE.Vector2;
let raycaster: THREE.Raycaster;
let texture: THREE.Texture;
let width: number, height: number;

const manager = new THREE.LoadingManager();
manager.onLoad = init;

const textureLoader = new THREE.TextureLoader(manager);
textureLoader.load("/vite.svg", (t) => {
  texture = t;
  // console.log(t.image.width, t.image.height);
  width = t.image.width;
  height = t.image.height;
});

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.z = 10;

  scene = new THREE.Scene();

  // scene.fog = new THREE.Fog(0xffffff, 700, 3000);

  // Pointer
  pointer = new THREE.Vector2();
  raycaster = new THREE.Raycaster();

  // addPic();

  function addPic() {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      map: texture,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
  }

  addPoints();

  function addPoints() {
    const geometry = new THREE.BufferGeometry();
    const count = width * height;
    const positions = new Float32Array(count * 3);
    const uvs = new Float32Array(count * 2);
    // const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const x = (i % width) / width;
      const y = Math.floor(i / width) / height;
      positions.set([x, y, 0], i * 3);
      uvs.set([x, y], i * 2);
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aUv", new THREE.BufferAttribute(uvs, 2));
    const material = new THREE.ShaderMaterial({
      vertexShader: positionVertexShader,
      fragmentShader: positionFragmentShader,
      uniforms: {
        uTexture: {
          value: texture,
        },
      },
    });

    const mesh = new THREE.Points(geometry, material);
    mesh.position.set(-0.5, -0.5, 0);
    scene.add(mesh);
  }

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.toneMapping = THREE.NeutralToneMapping;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera);
  controls.connect(renderer.domElement);

  // stats
  // {
  //   stats = new Stats({
  //     precision: 3,
  //     horizontal: false,
  //     trackGPU: true,
  //     trackCPT: true,
  //   });

  //   stats.init(renderer);
  //   container.appendChild(stats.dom);
  // }

  {
    // 避免在移动端上手指滑动时，页面滚动
    container.style.touchAction = "none";
    container.addEventListener("pointermove", onPointerMove);
  }

  window.addEventListener("resize", onWindowResize);
}

function onPointerMove(event: PointerEvent) {
  // 为了避免多点触控时，pointer 的值被覆盖
  if (event.isPrimary === false) return;

  // [x, y] 的值范围是 [-1, 1]
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  // 由于 y 轴在 threejs 中是向上的，所以需要取反
  pointer.y = 1 - (event.clientY / window.innerHeight) * 2;
}

function onWindowResize() {
  console.log("resize");
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  render();
  // stats.update();
}

function render() {
  const now = performance.now();
  let deltaTime = (now - last) / 1000;

  if (deltaTime > 1) deltaTime = 1; // safety cap on large deltas
  last = now;

  raycaster.setFromCamera(pointer, camera);
  // controls.update();

  renderer.render(scene, camera);
}

// init();
