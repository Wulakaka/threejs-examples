import * as THREE from "three/webgpu";
import {
  float,
  If,
  PI,
  color,
  cos,
  instanceIndex,
  Loop,
  mix,
  mod,
  sin,
  instancedArray,
  Fn,
  uint,
  uniform,
  uniformArray,
  hash,
  vec3,
  vec4,
  deltaTime,
} from "three/tsl";

import {Inspector} from "three/addons/inspector/Inspector.js";

import {OrbitControls} from "three/addons/controls/OrbitControls.js";

let camera: THREE.PerspectiveCamera,
  scene: THREE.Scene,
  renderer: THREE.WebGPURenderer,
  controls: OrbitControls,
  updateCompute: THREE.ComputeNode;

init();

async function init() {
  camera = new THREE.PerspectiveCamera(
    25,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(3, 5, 8);

  scene = new THREE.Scene();

  // ambient light

  const ambientLight = new THREE.AmbientLight("#ffffff", 0.5);
  scene.add(ambientLight);

  // directional light

  const directionalLight = new THREE.DirectionalLight("#ffffff", 1.5);
  directionalLight.position.set(4, 2, 0);
  scene.add(directionalLight);

  // renderer

  renderer = new THREE.WebGPURenderer({antialias: true});
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.setClearColor("#000000");
  renderer.inspector = new Inspector();
  document.body.appendChild(renderer.domElement);

  await renderer.init();

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 0.1;
  controls.maxDistance = 50;

  window.addEventListener("resize", onWindowResize);

  // Particles
  const material = new THREE.SpriteNodeMaterial({
    transparent: true,
    sizeAttenuation: true,
    scaleNode: float(0.02),
  });

  const count = 1000;

  const velocityDamping = uniform(0.1);

  const gravity = uniform(vec3(1, -2, 0));

  const boundHalfExtent = uniform(4);

  const maxSpeed = uniform(10);

  // 核心在于每次存储新的速度和位置，然后在 compute 中更新位置和速度
  // 存储位置信息
  const positionBuffer = instancedArray(count, "vec3");
  // 存储速度信息
  const velocityBuffer = instancedArray(count, "vec3");
  // 此处必须赋值，否则没有位置更新效果
  material.positionNode = positionBuffer.toAttribute();

  // init compute
  const initCompute = Fn(() => {
    const position = positionBuffer.element(instanceIndex);
    const velocity = velocityBuffer.element(instanceIndex);

    const basePosition = vec3(
      // [0, 1] 的随机数
      // 这里 * 0xffffff 将范围扩大到 [0, 16777215]
      hash(instanceIndex.add(uint(Math.random() * 0xffffff))),
      hash(instanceIndex.add(uint(Math.random() * 0xffffff))),
      hash(instanceIndex.add(uint(Math.random() * 0xffffff)))
    )
      .sub(0.5)
      .mul(5);

    position.assign(basePosition);
    velocity.assign(vec3(0));
  })().compute(count);

  renderer.compute(initCompute);

  // update compute
  updateCompute = Fn(() => {
    const position = positionBuffer.element(instanceIndex);
    const velocity = velocityBuffer.element(instanceIndex);

    const toCenter = position.sub(vec3(0, 0, 0));
    const distanceToCenter = toCenter.length();
    If(distanceToCenter.lessThan(2), () => {
      If(distanceToCenter.greaterThan(0.2), () => {
        velocity.subAssign(
          toCenter.normalize().mul(0.01).mul(toCenter.length().oneMinus())
        );
      }).Else(() => {
        velocity.addAssign(
          toCenter.normalize().mul(0.01).mul(toCenter.length().oneMinus())
        );
      });
    });

    // 更新速度
    velocity.addAssign(gravity.mul(deltaTime));

    const speed = velocity.length();
    If(speed.greaterThan(maxSpeed), () => {
      velocity.assign(velocity.normalize().mul(maxSpeed));
    });
    velocity.mulAssign(velocityDamping.oneMinus());

    // 更新位置
    position.addAssign(velocity.mul(deltaTime));

    // box bounce
    const halfHalfExtent = boundHalfExtent.div(2).toVar();
    position.assign(
      position.add(halfHalfExtent).mod(boundHalfExtent).sub(halfHalfExtent)
    );
  })().compute(count);

  const mesh = new THREE.Sprite(material);
  mesh.count = count;
  scene.add(mesh);

  // debug

  const gui = (<Inspector>renderer.inspector).createParameters("Parameters");

  gui.add(velocityDamping, "value", 0, 1, 0.01).name("velocityDamping");
  gui.add(maxSpeed, "value", 0, 20, 0.1).name("maxSpeed");
  gui.add(gravity.value, "x", -10, 10, 0.1).name("gravityX");
  gui.add(gravity.value, "y", -10, 10, 0.1).name("gravityY");
  gui.add(gravity.value, "z", -10, 10, 0.1).name("gravityZ");
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

async function animate() {
  controls.update();

  renderer.compute(updateCompute);
  renderer.render(scene, camera);
}
