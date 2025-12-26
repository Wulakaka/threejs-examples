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

const gui = new GUI({width: 340});

const container = document.createElement("div");
document.body.appendChild(container);

const canvas = document.createElement("canvas");
container.appendChild(canvas);

// Scene
const scene = new THREE.Scene();

// Loaders
const textureLoader = new THREE.TextureLoader();

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
camera.position.set(1.5, 0, 6);
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */

const renderer = new THREE.WebGPURenderer({
  canvas: canvas,
  alpha: true,
  antialias: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Material
 */
const colorNode = Fn(() => {});

const positionNode = Fn(() => {});

const material = new THREE.MeshBasicNodeMaterial({
  // colorNode: colorNode(),
  // positionNode: positionNode(),
  depthWrite: false,
  transparent: true,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
});

/**
 * Objects
 */
const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
scene.add(mesh);

renderer.init().then(() => {
  /**
   * Animate
   */
  renderer.setAnimationLoop((t) => {
    // Update controls
    controls.update();

    // Render
    renderer.render(scene, camera);
  });
});
