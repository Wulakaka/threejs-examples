import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import {float, instancedBufferAttribute} from "three/tsl";
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
 * Firework
 */
const createFirework = (
  count: number,
  position: THREE.Vector3,
  size: number
) => {
  const positionArray = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    positionArray[i3 + 0] = Math.random() - 0.5;
    positionArray[i3 + 1] = Math.random() - 0.5;
    positionArray[i3 + 2] = Math.random() - 0.5;
  }

  const positionAttribute = new THREE.InstancedBufferAttribute(
    positionArray,
    3
  );

  // Material
  const material = new THREE.SpriteNodeMaterial({
    positionNode: instancedBufferAttribute(positionAttribute),
    sizeAttenuation: true,
  });
  material.scaleNode = float(size);

  // Points
  const firework = new THREE.Sprite(material);
  // 需要指定 count 才有效果
  firework.count = count;
  firework.position.copy(position);
  scene.add(firework);
};

createFirework(100, new THREE.Vector3(0, 0, 0), 0.1);
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
