import * as THREE from "three";
import {
  GPUComputationRenderer,
  OrbitControls,
  Variable,
} from "three/examples/jsm/Addons.js";
import "./style.css";
import { ButterflyGeometry } from "./models/ButterflyGeometry";
import butterflyVertexShader from "@/shaders/butterfly/vertex.glsl?raw";
import butterflyFragmentShader from "@/shaders/butterfly/fragment.glsl?raw";
import velocityFragmentShader from "@/shaders/gpgpu/velocity.glsl?raw";
import positionFragmentShader from "@/shaders/gpgpu/position.glsl?raw";
import directionFragmentShader from "@/shaders/gpgpu/direction.glsl?raw";

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 50;

  const scene = new THREE.Scene();

  const butterflyUniforms: THREE.ShaderMaterial["uniforms"] = {
    uTime: { value: 0.0 },
    uDelta: { value: 0.0 },
    uTexturePosition: {
      value: null,
    },
    uTextureVelocity: {
      value: null,
    },
    uTextureDirection: {
      value: null,
    },
  };

  let gpuCompute: GPUComputationRenderer;
  let velocityVariable: Variable;
  let positionVariable: Variable;
  let directionVariable: Variable;

  let velocityUniforms: THREE.ShaderMaterial["uniforms"];
  let positionUniforms: THREE.ShaderMaterial["uniforms"];
  let directionUniforms: THREE.ShaderMaterial["uniforms"];

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

  window.addEventListener("resize", onWindowResize, false);

  initButterfly();

  const box = new THREE.AxesHelper(10);
  scene.add(box);

  initComputeRenderer();

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

    gpuCompute.compute();

    raycaster.setFromCamera(pointer, camera);

    butterflyUniforms.uTime.value = now;
    butterflyUniforms.uDelta.value = delta;
    butterflyUniforms.uTextureVelocity.value =
      gpuCompute.getCurrentRenderTarget(velocityVariable).texture;
    butterflyUniforms.uTexturePosition.value =
      gpuCompute.getCurrentRenderTarget(positionVariable).texture;
    butterflyUniforms.uTextureDirection.value =
      gpuCompute.getCurrentRenderTarget(directionVariable).texture;

    velocityUniforms.uTime.value = now;
    velocityUniforms.uDelta.value = delta;
    positionUniforms.uTime.value = now;
    positionUniforms.uDelta.value = delta;

    velocityUniforms.uRayOrigin.value = raycaster.ray.origin;
    velocityUniforms.uRayDirection.value = raycaster.ray.direction;

    directionUniforms.uDelta.value = delta;

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
  }

  function initComputeRenderer() {
    // 创建计算渲染器
    gpuCompute = new GPUComputationRenderer(1, 1, renderer);
    // 创建纹理
    const dtVelocity = gpuCompute.createTexture();
    const dtPosition = gpuCompute.createTexture();
    const dtDirection = gpuCompute.createTexture();
    // 初始化纹理
    fillVelocityTexture(dtVelocity);
    fillPositionTexture(dtPosition);
    dtDirection.image.data = dtPosition.image.data;

    velocityVariable = gpuCompute.addVariable(
      "textureVelocity",
      velocityFragmentShader,
      dtVelocity
    );

    positionVariable = gpuCompute.addVariable(
      "texturePosition",
      positionFragmentShader,
      dtPosition
    );

    directionVariable = gpuCompute.addVariable(
      "textureDirection",
      directionFragmentShader,
      dtDirection
    );
    gpuCompute.setVariableDependencies(velocityVariable, [
      velocityVariable,
      positionVariable,
    ]);
    gpuCompute.setVariableDependencies(positionVariable, [
      positionVariable,
      velocityVariable,
    ]);
    gpuCompute.setVariableDependencies(directionVariable, [
      directionVariable,
      velocityVariable,
    ]);

    velocityUniforms = velocityVariable.material.uniforms;
    positionUniforms = positionVariable.material.uniforms;
    directionUniforms = directionVariable.material.uniforms;

    velocityUniforms.uTime = { value: 0.0 };
    velocityUniforms.uDelta = { value: 0.0 };
    velocityUniforms.uRayOrigin = { value: new THREE.Vector3() };
    velocityUniforms.uRayDirection = { value: new THREE.Vector3() };

    positionUniforms.uTime = { value: 0.0 };
    positionUniforms.uDelta = { value: 0.0 };

    directionUniforms.uDelta = { value: 0.0 };

    const error = gpuCompute.init();
    if (error !== null) {
      console.error(error);
    }
  }

  function initButterfly() {
    const geometry = new ButterflyGeometry();
    const material = new THREE.ShaderMaterial({
      vertexShader: butterflyVertexShader,
      fragmentShader: butterflyFragmentShader,
      uniforms: butterflyUniforms,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);

    mesh.rotation.x = Math.PI / 2;
    mesh.rotation.z = -Math.PI / 2;

    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();

    scene.add(mesh);
  }
}

function fillPositionTexture(texture: THREE.DataTexture) {
  const theArray = texture.image.data as Float32Array;

  for (let k = 0, kl = theArray.length; k < kl; k += 4) {
    const i = k / 4;

    const x = Math.random() - 0.5;
    const y = Math.random() - 0.5;
    const z = Math.random() - 0.5;

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

    theArray[k + 0] = x * 0.01;
    theArray[k + 1] = y * 0.01;
    theArray[k + 2] = z * 0.01;
    theArray[k + 3] = 1;
  }
}

init();
