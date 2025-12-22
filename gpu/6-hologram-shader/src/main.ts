import model from "@/assets/suzanne.glb?url";
import {GLTFLoader} from "three/examples/jsm/Addons.js";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import {
  add,
  cameraPosition,
  Fn,
  normalWorld,
  positionLocal,
  positionWorld,
  rand,
  sin,
  smoothstep,
  time,
  uniform,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import * as THREE from "three/webgpu";

const uColor = uniform(new THREE.Color("#70c1ff"), "color");

const gui = new GUI();

gui.addColor(uColor, "value").name("uColor");

const container = document.createElement("div");
document.body.appendChild(container);

const canvas = document.createElement("canvas");
container.appendChild(canvas);

// Scene
const scene = new THREE.Scene();

// Loaders
const gltfLoader = new GLTFLoader();

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
  25,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.x = 7;
camera.position.y = 7;
camera.position.z = 7;
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const rendererParameters = {
  clearColor: "#1d1f2a",
};

const renderer = new THREE.WebGPURenderer({
  canvas: canvas,
  alpha: true,
  antialias: true,
});
renderer.setClearColor(rendererParameters.clearColor);
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

gui.addColor(rendererParameters, "clearColor").onChange(() => {
  renderer.setClearColor(rendererParameters.clearColor);
});

/**
 * Material
 */
const colorNode = Fn(() => {
  // stripes
  const stripes = positionWorld.y.sub(time.mul(0.02)).mul(20).fract();
  // make the gradient sharper
  stripes.powAssign(3);

  // Fresnel
  const viewDirection = positionWorld.sub(cameraPosition).normalize();
  const fresnel = normalWorld.dot(viewDirection).add(1);
  fresnel.powAssign(2);

  // Falloff
  const falloff = smoothstep(0.8, 0.0, fresnel);

  // Holographic
  const holographic = stripes.mul(fresnel);
  holographic.addAssign(fresnel.mul(1.25));
  // 通过衰减，让边缘看起来跟柔和
  holographic.mulAssign(falloff);

  return vec4(uColor, holographic);
});

const random2D = Fn(({value}: {value: ReturnType<typeof vec2>}) => {
  return value.dot(vec2(12.9898, 78.233)).sin().mul(43758.5453123).fract();
});

const positionNode = Fn(() => {
  // Glitch effect
  const glitchTime = time.sub(positionLocal.y);
  // 使用多个不同频率的正弦波叠加让抖动看起来是随机的
  const glitchStrength = add(
    sin(glitchTime),
    sin(glitchTime.mul(3.45)),
    sin(glitchTime.mul(8.76))
  );
  glitchStrength.divAssign(3);
  glitchStrength.smoothstepAssign(0.3, 1);
  glitchStrength.mulAssign(0.25);

  const x = positionLocal.x.add(
    rand(positionLocal.xz.add(time)).sub(0.5).mul(glitchStrength)
  );
  const z = positionLocal.z.add(
    rand(positionLocal.zx.add(time)).sub(0.5).mul(glitchStrength)
  );
  return vec3(x, positionLocal.y, z);
});

const material = new THREE.MeshBasicNodeMaterial({
  colorNode: colorNode(),
  positionNode: positionNode(),
  depthWrite: false,
  transparent: true,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
});

/**
 * Objects
 */
// Torus knot
const torusKnot = new THREE.Mesh(
  new THREE.TorusKnotGeometry(0.6, 0.25, 128, 32),
  material
);
torusKnot.position.x = 3;
scene.add(torusKnot);

// Sphere
const sphere = new THREE.Mesh(new THREE.SphereGeometry(), material);
sphere.position.x = -3;
scene.add(sphere);

// Model
let suzanne: THREE.Group | null = null;
gltfLoader.load(model, (gltf) => {
  suzanne = gltf.scene;
  suzanne.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.material = material;
    }
  });

  scene.add(suzanne);
});

renderer.init().then(() => {
  /**
   * Animate
   */
  renderer.setAnimationLoop((t) => {
    const elapsedTime = t * 0.001;
    // Rotate objects
    if (suzanne) {
      suzanne.rotation.x = -elapsedTime * 0.1;
      suzanne.rotation.y = elapsedTime * 0.2;
    }

    sphere.rotation.x = -elapsedTime * 0.1;
    sphere.rotation.y = elapsedTime * 0.2;

    torusKnot.rotation.x = -elapsedTime * 0.1;
    torusKnot.rotation.y = elapsedTime * 0.2;
    // Update controls
    controls.update();

    // Render
    renderer.render(scene, camera);
  });
});
