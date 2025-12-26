import gsap from "gsap";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import {
  color,
  float,
  instancedBufferAttribute,
  texture,
  uniform,
  uv,
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
 * Firework
 */
const textures = [
  textureLoader.load("./particles/1.png"),
  textureLoader.load("./particles/2.png"),
  textureLoader.load("./particles/3.png"),
  textureLoader.load("./particles/4.png"),
  textureLoader.load("./particles/5.png"),
  textureLoader.load("./particles/6.png"),
  textureLoader.load("./particles/7.png"),
  textureLoader.load("./particles/8.png"),
];

const createFirework = (
  count: number,
  position: THREE.Vector3,
  size: number,
  map: THREE.Texture,
  radius: number,
  c: THREE.Color
) => {
  const positionArray = new Float32Array(count * 3);
  const randomArray = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;

    const spherical = new THREE.Spherical(
      radius * (0.75 + Math.random() * 0.25),
      Math.random() * Math.PI,
      Math.random() * Math.PI * 2
    );

    const position = new THREE.Vector3();
    position.setFromSpherical(spherical);

    positionArray[i3 + 0] = position.x;
    positionArray[i3 + 1] = position.y;
    positionArray[i3 + 2] = position.z;

    randomArray[i] = Math.random();
  }

  const positionAttribute = new THREE.InstancedBufferAttribute(
    positionArray,
    3
  );
  const randomAttribute = new THREE.InstancedBufferAttribute(randomArray, 1);

  const pos = instancedBufferAttribute(positionAttribute);

  const aRandom = instancedBufferAttribute(randomAttribute);

  const progress = uniform(0);

  const textureAlpha = texture(map, uv()).r;

  // Material
  const material = new THREE.SpriteNodeMaterial({
    positionNode: pos,
    sizeAttenuation: true,
    // map: map,
    transparent: true,
    colorNode: vec4(color(c), textureAlpha),
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  material.scaleNode = float(size).mul(aRandom);

  // Points
  const firework = new THREE.Sprite(material);
  // 需要指定 count 才有效果
  firework.count = count;
  firework.position.copy(position);
  scene.add(firework);

  const destroy = () => {
    scene.remove(firework);
    material.dispose();
  };

  gsap.to(progress, {
    value: 1,
    duration: 3,
    ease: "linear",
    onComplete: () => {
      destroy();
    },
  });
};

createFirework(
  100,
  new THREE.Vector3(0, 0, 0),
  0.1,
  textures[7],
  1,
  new THREE.Color("#8affff")
);

window.addEventListener("click", () => {
  createFirework(
    100,
    new THREE.Vector3(0, 0, 0),
    0.1,
    textures[7],
    1,
    new THREE.Color("#8affff")
  );
});

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
