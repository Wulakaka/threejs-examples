import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import "./style.css";
import positionVertexShader from "@/shaders/position/vertex.glsl?raw";
import positionFragmentShader from "@/shaders/position/fragment.glsl?raw";
import { GPUComputationRenderer, Variable } from "three/examples/jsm/Addons.js";

import fragmentShaderVelocity from "./shaders/gpgpu/velocity.glsl?raw";
import fragmentShaderPosition from "./shaders/gpgpu/position.glsl?raw";
import vertexShader from "./shaders/bird/vertex.glsl?raw";
import fragmentShader from "./shaders/bird/fragment.glsl?raw";
import { BirdGeometry } from "./models/BirdGeometry";

const BOUNDS = 800;
const BOUNDS_HALF = BOUNDS / 2;
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

let gpuCompute: GPUComputationRenderer;
// Variable 就是一种数据类型
let velocityVariable: Variable;
let positionVariable: Variable;
let positionUniforms: THREE.ShaderMaterial["uniforms"];
let velocityUniforms: THREE.ShaderMaterial["uniforms"];
let birdUniforms: THREE.ShaderMaterial["uniforms"];

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    5000
  );
  camera.position.z = 500;

  scene = new THREE.Scene();
  // scene.background = new THREE.Color(0xffffff);

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

  initComputeRenderer();

  initBirds();

  {
    // 避免在移动端上手指滑动时，页面滚动
    container.style.touchAction = "none";
    container.addEventListener("pointermove", onPointerMove);
  }

  window.addEventListener("resize", onWindowResize);
}

function initComputeRenderer() {
  gpuCompute = new GPUComputationRenderer(width, height, renderer);

  const dtPosition = gpuCompute.createTexture();
  const dtVelocity = gpuCompute.createTexture();
  fillPositionTexture(dtPosition);
  fillVelocityTexture(dtVelocity);

  velocityVariable = gpuCompute.addVariable(
    "textureVelocity",
    fragmentShaderVelocity,
    dtVelocity
  );
  positionVariable = gpuCompute.addVariable(
    "texturePosition",
    fragmentShaderPosition,
    dtPosition
  );

  gpuCompute.setVariableDependencies(velocityVariable, [
    positionVariable,
    velocityVariable,
  ]);
  gpuCompute.setVariableDependencies(positionVariable, [
    positionVariable,
    velocityVariable,
  ]);

  positionUniforms = positionVariable.material.uniforms;
  velocityUniforms = velocityVariable.material.uniforms;

  positionUniforms["time"] = { value: 0.0 };
  positionUniforms["delta"] = { value: 0.0 };
  velocityUniforms["time"] = { value: 1.0 };
  velocityUniforms["delta"] = { value: 0.0 };
  velocityUniforms["testing"] = { value: 1.0 };
  // 分离距离
  velocityUniforms["separationDistance"] = { value: 1.0 };
  // 对齐距离
  velocityUniforms["alignmentDistance"] = { value: 1.0 };
  // 聚合距离
  velocityUniforms["cohesionDistance"] = { value: 1.0 };
  velocityUniforms["freedomFactor"] = { value: 1.0 };

  // // 表示捕食者的位置
  // velocityUniforms["predator"] = { value: new THREE.Vector3() };
  velocityVariable.material.defines.BOUNDS = BOUNDS.toFixed(2);

  // raycaster 的起始位置和方向
  velocityUniforms["rayOrigin"] = { value: new THREE.Vector3() };
  velocityUniforms["rayDirection"] = { value: new THREE.Vector3() };

  velocityVariable.wrapS = THREE.RepeatWrapping;
  velocityVariable.wrapT = THREE.RepeatWrapping;
  positionVariable.wrapS = THREE.RepeatWrapping;
  positionVariable.wrapT = THREE.RepeatWrapping;

  const error = gpuCompute.init();

  if (error !== null) {
    console.error(error);
  }

  // addDebugMesh();

  function addDebugMesh() {
    // Debug
    const debug: {
      velocityMesh?: THREE.Mesh;
      positionMesh?: THREE.Mesh;
    } = {};
    // 通过获取 texture 来创建一个用于 debug 的 mesh
    debug.velocityMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({
        map: gpuCompute.getCurrentRenderTarget(velocityVariable).texture,
      })
    );
    debug.velocityMesh.position.x = -100;
    debug.velocityMesh.scale.setScalar(4);
    // debug.velocityMesh.visible = false;
    scene.add(debug.velocityMesh);

    debug.positionMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({
        map: gpuCompute.getCurrentRenderTarget(positionVariable).texture,
      })
    );
    debug.positionMesh.position.x = 100;
    debug.positionMesh.scale.setScalar(4);
    // debug.positionMesh.visible = false;
    scene.add(debug.positionMesh);
  }
}

function initBirds() {
  const geometry = new BirdGeometry(width, height);

  // For Vertex and Fragment
  birdUniforms = {
    color: { value: new THREE.Color(0xff2200) },
    texturePosition: { value: null },
    textureVelocity: { value: null },
    textureColor: { value: texture },
    time: { value: 1.0 },
    delta: { value: 0.0 },
  };

  // THREE.ShaderMaterial
  const material = new THREE.ShaderMaterial({
    uniforms: birdUniforms,
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
  });

  const birdMesh = new THREE.Mesh(geometry, material);
  birdMesh.rotation.y = Math.PI / 2;

  // 关闭自动更新矩阵
  birdMesh.matrixAutoUpdate = false;
  // 仅在第一次渲染时更新矩阵，后续无需更新
  birdMesh.updateMatrix();

  scene.add(birdMesh);
}

// 生成位置
function fillPositionTexture(texture: THREE.DataTexture) {
  const theArray = texture.image.data as Float32Array;

  for (let k = 0, kl = theArray.length; k < kl; k += 4) {
    const i = k / 4;

    const x = (i % height) / width;
    const y = ~~(i / width) / height;

    // 不能设置为 0，会导致程序崩溃
    const z = Math.random() - 0.5;

    theArray[k + 0] = x * BOUNDS - BOUNDS_HALF;
    theArray[k + 1] = y * BOUNDS - BOUNDS_HALF;
    theArray[k + 2] = z;
    theArray[k + 3] = 1;
  }
}

// 随机生成速度，范围在 [-5, 5] * [-5, 5] * [-5, 5] 之间
function fillVelocityTexture(texture: THREE.DataTexture) {
  const theArray = texture.image.data as Float32Array;

  for (let k = 0, kl = theArray.length; k < kl; k += 4) {
    const x = Math.random() - 0.5;
    const y = Math.random() - 0.5;
    const z = Math.random() - 0.5;

    theArray[k + 0] = x * 10;
    theArray[k + 1] = y * 10;
    theArray[k + 2] = z * 10;
    theArray[k + 3] = 1;
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
  let delta = (now - last) / 1000;

  if (delta > 1) delta = 1; // safety cap on large deltas
  last = now;

  raycaster.setFromCamera(pointer, camera);

  positionUniforms["time"].value = now;
  positionUniforms["delta"].value = delta;
  velocityUniforms["time"].value = now;
  velocityUniforms["delta"].value = delta;
  birdUniforms["time"].value = now;
  birdUniforms["delta"].value = delta;

  velocityUniforms["rayOrigin"].value.copy(raycaster.ray.origin);
  velocityUniforms["rayDirection"].value.copy(raycaster.ray.direction);

  gpuCompute.compute();

  birdUniforms["texturePosition"].value =
    gpuCompute.getCurrentRenderTarget(positionVariable).texture;
  birdUniforms["textureVelocity"].value =
    gpuCompute.getCurrentRenderTarget(velocityVariable).texture;

  renderer.render(scene, camera);

  // Move pointer away so we only affect birds when moving the mouse
  pointer.y = 10;
}

// init();
