import * as THREE from "three/webgpu";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import {
  atan,
  color,
  cos,
  distance,
  float,
  Fn,
  instancedBufferAttribute,
  length,
  mix,
  sin,
  texture,
  time,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import {GLTFLoader} from "three/examples/jsm/Addons.js";
import model from "@/assets/bakedModel.glb?url";
import img from "@/assets/perlin.png";

const gui = new GUI();

const container = document.createElement("div");
document.body.appendChild(container);

const canvas = document.createElement("canvas");
container.appendChild(canvas);

// Scene
const scene = new THREE.Scene();

// Loaders
const gltfLoader = new GLTFLoader();

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
camera.position.x = 8;
camera.position.y = 10;
camera.position.z = 12;
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.target.y = 3;
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGPURenderer({
  canvas: canvas,
  alpha: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Model
gltfLoader.load(model, (gltf) => {
  (<THREE.MeshStandardMaterial>(
    (<THREE.Mesh>gltf.scene.getObjectByName("baked")).material
  )).map!.anisotropy = 8;
  scene.add(gltf.scene);
});

const t = textureLoader.load(img);

// Smoke
const smokeGeometry = new THREE.PlaneGeometry(1, 1, 16, 64);
smokeGeometry.translate(0, 0.5, 0);
smokeGeometry.scale(1.5, 6, 1.5);

// Material
const smokeMaterial = new THREE.MeshBasicNodeMaterial({
  colorNode: texture(t, uv()),
  side: THREE.DoubleSide,
});

const smoke = new THREE.Mesh(smokeGeometry, smokeMaterial);
smoke.position.y = 1.83;
scene.add(smoke);

renderer.init().then(() => {
  /**
   * Animate
   */
  renderer.setAnimationLoop(() => {
    // Update controls
    controls.update();

    // Render
    renderer.render(scene, camera);
  });
});
