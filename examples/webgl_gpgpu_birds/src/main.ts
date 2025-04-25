import "./style.css";

import * as THREE from "three";

import Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import {
  GPUComputationRenderer,
  type Variable,
} from "three/addons/misc/GPUComputationRenderer.js";

import fragmentShaderVelocity from "./shaders/gpgpu/velocity.glsl?raw";
import fragmentShaderPosition from "./shaders/gpgpu/position.glsl?raw";
import vertexShader from "./shaders/bird/vertex.glsl?raw";
import fragmentShader from "./shaders/bird/fragment.glsl?raw";

/* TEXTURE WIDTH FOR SIMULATION */
// 用于gpgpu纹理的尺寸
const WIDTH = 32;

const BIRDS = WIDTH * WIDTH;

// Custom Geometry - using 3 triangles each. No UVs, no normals currently.
class BirdGeometry extends THREE.BufferGeometry {
  constructor() {
    super();

    // 每个鸟有3个三角形
    const trianglesPerBird = 3;
    // 所有鸟的三角形数量
    const triangles = BIRDS * trianglesPerBird;
    // 每个三角形有3个顶点
    // 所有三角形的顶点数量
    const points = triangles * 3;

    // 位置属性
    const vertices = new THREE.BufferAttribute(new Float32Array(points * 3), 3);
    // 颜色属性
    const birdColors = new THREE.BufferAttribute(
      new Float32Array(points * 3),
      3
    );
    // 参考属性
    // 为什么是乘以 2 ？
    // 因为只有 x 和 y 坐标
    const references = new THREE.BufferAttribute(
      new Float32Array(points * 2),
      2
    );

    // TODO: 鸟的位置？
    const birdVertex = new THREE.BufferAttribute(new Float32Array(points), 1);

    this.setAttribute("position", vertices);
    this.setAttribute("birdColor", birdColors);
    this.setAttribute("reference", references);
    this.setAttribute("birdVertex", birdVertex);

    // this.setAttribute( 'normal', new Float32Array( points * 3 ), 3 );

    let v = 0;

    // 填充顶点数据
    function verts_push(...list: number[]) {
      for (let i = 0; i < list.length; i++) {
        vertices.array[v++] = list[i];
      }
    }

    const wingsSpan = 20;
    // 构建鸟的几何体
    for (let f = 0; f < BIRDS; f++) {
      // Body

      verts_push(0, -0, -20, 0, 4, -20, 0, 0, 30);

      // Wings

      verts_push(0, 0, -15, -wingsSpan, 0, 0, 0, 0, 15);

      verts_push(0, 0, 15, wingsSpan, 0, 0, 0, 0, -15);
    }

    for (let v = 0; v < triangles * 3; v++) {
      // ~~ 是 Math.floor 的简写
      // 三角形的索引
      const triangleIndex = ~~(v / 3);
      // 鸟的索引
      const birdIndex = ~~(triangleIndex / trianglesPerBird);
      // 横向占比
      const x = (birdIndex % WIDTH) / WIDTH;
      // 纵向占比
      const y = ~~(birdIndex / WIDTH) / WIDTH;

      // 计算颜色，颜色信息表示位置信息
      const c = new THREE.Color(0x666666 + (~~(v / 9) / BIRDS) * 0x666666);

      birdColors.array[v * 3 + 0] = c.r;
      birdColors.array[v * 3 + 1] = c.g;
      birdColors.array[v * 3 + 2] = c.b;

      // 画布的位置信息表示对应的鸟
      references.array[v * 2] = x;
      references.array[v * 2 + 1] = y;

      // TODO: 什么意思？[0,1,2,3,4,5,6,7,8,0,1,2,3,4,5,6,7,8,...] 表示顶点索引？
      birdVertex.array[v] = v % 9;
    }

    this.scale(0.2, 0.2, 0.2);
  }
}

//

let container: HTMLDivElement, stats: Stats;
let camera: THREE.PerspectiveCamera,
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer;
let mouseX = 0,
  mouseY = 0;

let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

// 差不多是半屏幕的大小，如果设置的较小，则看不出鼠标追赶的效果
const BOUNDS = 800,
  BOUNDS_HALF = BOUNDS / 2;

let last = performance.now();

let gpuCompute: GPUComputationRenderer;
// Variable 就是一种数据类型
let velocityVariable: Variable;
let positionVariable: Variable;
let positionUniforms: THREE.ShaderMaterial["uniforms"];
let velocityUniforms: THREE.ShaderMaterial["uniforms"];
let birdUniforms: THREE.ShaderMaterial["uniforms"];

init();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1,
    3000
  );
  camera.position.z = 350;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  scene.fog = new THREE.Fog(0xffffff, 100, 1000);

  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  // 替代 requestAnimationFrame
  renderer.setAnimationLoop(animate);
  container.appendChild(renderer.domElement);

  initComputeRenderer();

  // 帧率统计
  stats = new Stats();
  container.appendChild(stats.dom);

  container.style.touchAction = "none";
  container.addEventListener("pointermove", onPointerMove);

  window.addEventListener("resize", onWindowResize);

  const gui = new GUI();

  const effectController = {
    separation: 20.0,
    alignment: 20.0,
    cohesion: 20.0,
    freedom: 0.75,
  };

  const valuesChanger = function () {
    velocityUniforms["separationDistance"].value = effectController.separation;
    velocityUniforms["alignmentDistance"].value = effectController.alignment;
    velocityUniforms["cohesionDistance"].value = effectController.cohesion;
    velocityUniforms["freedomFactor"].value = effectController.freedom;
  };

  valuesChanger();

  gui
    .add(effectController, "separation", 0.0, 100.0, 1.0)
    .onChange(valuesChanger);
  gui
    .add(effectController, "alignment", 0.0, 100, 0.001)
    .onChange(valuesChanger);
  gui
    .add(effectController, "cohesion", 0.0, 100, 0.025)
    .onChange(valuesChanger);
  gui.close();

  initBirds();
}

function initComputeRenderer() {
  gpuCompute = new GPUComputationRenderer(WIDTH, WIDTH, renderer);

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
  // 表示捕食者的位置
  velocityUniforms["predator"] = { value: new THREE.Vector3() };
  velocityVariable.material.defines.BOUNDS = BOUNDS.toFixed(2);

  velocityVariable.wrapS = THREE.RepeatWrapping;
  velocityVariable.wrapT = THREE.RepeatWrapping;
  positionVariable.wrapS = THREE.RepeatWrapping;
  positionVariable.wrapT = THREE.RepeatWrapping;

  const error = gpuCompute.init();

  if (error !== null) {
    console.error(error);
  }

  addDebugMesh();

  function addDebugMesh() {
    // Debug
    const debug: {
      velocityMesh?: THREE.Mesh;
      positionMesh?: THREE.Mesh;
    } = {};
    // 通过获取 texture 来创建一个用于 debug 的 mesh
    debug.velocityMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(WIDTH, WIDTH),
      new THREE.MeshBasicMaterial({
        map: gpuCompute.getCurrentRenderTarget(velocityVariable).texture,
      })
    );
    debug.velocityMesh.position.z = 250;
    debug.velocityMesh.position.x = -20;
    // debug.velocityMesh.visible = false;
    scene.add(debug.velocityMesh);

    debug.positionMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(WIDTH, WIDTH),
      new THREE.MeshBasicMaterial({
        map: gpuCompute.getCurrentRenderTarget(positionVariable).texture,
      })
    );
    debug.positionMesh.position.z = 250;
    debug.positionMesh.position.x = 20;
    // debug.positionMesh.visible = false;
    scene.add(debug.positionMesh);
  }
}

function initBirds() {
  const geometry = new BirdGeometry();

  // For Vertex and Fragment
  birdUniforms = {
    color: { value: new THREE.Color(0xff2200) },
    texturePosition: { value: null },
    textureVelocity: { value: null },
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
  // TODO: 为什么要设置为 false？
  // 关闭自动更新矩阵，手动更新矩阵
  birdMesh.matrixAutoUpdate = false;
  birdMesh.updateMatrix();

  scene.add(birdMesh);
}

function fillPositionTexture(texture: THREE.DataTexture) {
  const theArray = texture.image.data as Float32Array;

  for (let k = 0, kl = theArray.length; k < kl; k += 4) {
    const x = Math.random() * BOUNDS - BOUNDS_HALF;
    const y = Math.random() * BOUNDS - BOUNDS_HALF;
    const z = Math.random() * BOUNDS - BOUNDS_HALF;

    theArray[k + 0] = x;
    theArray[k + 1] = y;
    theArray[k + 2] = z;
    theArray[k + 3] = 1;
  }
}

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

function onWindowResize() {
  windowHalfX = window.innerWidth / 2;
  windowHalfY = window.innerHeight / 2;

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onPointerMove(event: PointerEvent) {
  if (event.isPrimary === false) return;

  mouseX = event.clientX - windowHalfX;
  mouseY = event.clientY - windowHalfY;
}

//

function animate() {
  render();
  stats.update();
}

function render() {
  const now = performance.now();
  let delta = (now - last) / 1000;

  if (delta > 1) delta = 1; // safety cap on large deltas
  last = now;

  positionUniforms["time"].value = now;
  positionUniforms["delta"].value = delta;
  velocityUniforms["time"].value = now;
  velocityUniforms["delta"].value = delta;
  birdUniforms["time"].value = now;
  birdUniforms["delta"].value = delta;

  // [-0.5, 0.5] 的范围内
  velocityUniforms["predator"].value.set(
    (0.5 * mouseX) / windowHalfX,
    (-0.5 * mouseY) / windowHalfY,
    0
  );

  mouseX = 10000;
  mouseY = 10000;

  gpuCompute.compute();

  birdUniforms["texturePosition"].value =
    gpuCompute.getCurrentRenderTarget(positionVariable).texture;
  birdUniforms["textureVelocity"].value =
    gpuCompute.getCurrentRenderTarget(velocityVariable).texture;

  renderer.render(scene, camera);
}
