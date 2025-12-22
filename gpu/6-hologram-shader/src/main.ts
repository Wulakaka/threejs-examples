import * as THREE from "three/webgpu";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import {
  atan,
  cameraPosition,
  cos,
  Fn,
  positionLocal,
  rotate,
  sin,
  smoothstep,
  texture,
  time,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import {GLTFLoader} from "three/examples/jsm/Addons.js";
import model from "@/assets/suzanne.glb?url";

const gui = new GUI();

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
const material = new THREE.MeshBasicMaterial();

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

const colorNode = Fn(() => {
  return vec4(1);
});

const positionNode = Fn(() => {
  return positionLocal;
});

// Material
const smokeMaterial = new THREE.MeshBasicNodeMaterial({
  colorNode: colorNode(),
  // color: "red",
  positionNode: positionNode(),
  depthWrite: false,
  // wireframe: true,
  side: THREE.DoubleSide,
  transparent: true,
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
