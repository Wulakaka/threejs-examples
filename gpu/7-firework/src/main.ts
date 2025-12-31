import gsap from "gsap";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import {
  color,
  float,
  Fn,
  instancedBufferAttribute,
  min,
  mix,
  pow,
  sin,
  texture,
  uniform,
  uv,
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
  detail: number,
  position: THREE.Vector3,
  size: number,
  map: THREE.Texture,
  radius: number,
  c: THREE.Color
) => {
  const geometry = new THREE.IcosahedronGeometry(radius, detail);

  const positionArray = geometry.getAttribute("position").array;
  const count = geometry.getAttribute("position").count;
  const randomArray = new Float32Array(count);

  const timeMultipliersArray = new Float32Array(count);
  const offset = 0.15;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    positionArray[i3 + 0] += Math.random() * offset;
    positionArray[i3 + 1] += Math.random() * offset;
    positionArray[i3 + 2] += Math.random() * offset;

    randomArray[i] = Math.random();

    timeMultipliersArray[i] = 1 + Math.random();
  }

  const positionAttribute = new THREE.InstancedBufferAttribute(
    positionArray,
    3
  );
  const randomAttribute = new THREE.InstancedBufferAttribute(randomArray, 1);

  const timeMultipliersAttribute = new THREE.InstancedBufferAttribute(
    timeMultipliersArray,
    1
  );

  const pos = instancedBufferAttribute(positionAttribute);

  // 0-1
  const aRandom = instancedBufferAttribute(randomAttribute);

  const aTimeMultiplier = instancedBufferAttribute(timeMultipliersAttribute);

  const uProgress = uniform(0);

  const textureAlpha = texture(map, uv()).r;

  const positionNode = Fn(
    ([pos, progress]: [ReturnType<typeof vec3>, ReturnType<typeof float>]) => {
      const p = pos.toVar();

      // Exploding
      const explodingProgress = progress.remap(0, 0.1).toVar();
      explodingProgress.clampAssign(0, 1);
      explodingProgress.assign(pow(explodingProgress.oneMinus(), 3).oneMinus());
      p.assign(mix(vec3(0), p, explodingProgress));

      // Falling
      const fallingProgress = progress.remap(0.1, 1).toVar();
      fallingProgress.clampAssign(0, 1);
      fallingProgress.assign(pow(fallingProgress.oneMinus(), 3).oneMinus());
      p.y.subAssign(fallingProgress.mul(0.2));

      return p;
    }
  );

  const scaleNode = Fn(
    ([size, progress]: [
      ReturnType<typeof float>,
      ReturnType<typeof float>,
    ]) => {
      const s = size.toVar();

      // Scaling
      const sizeOpeningProgress = progress.remap(0, 0.125).toVar();
      const sizeClosingProgress = progress.remap(0.125, 1, 1, 0).toVar();
      const sizeProgress = min(sizeOpeningProgress, sizeClosingProgress).clamp(
        0,
        1
      );

      // Twinkling
      const twinklingProgress = progress.remap(0.2, 0.8).clamp(0, 1);
      const sizeTwinkling = sin(progress.mul(30))
        .mul(0.5)
        .add(0.5)
        .mul(twinklingProgress)
        .oneMinus();

      return s.mul(aRandom).mul(sizeProgress).mul(sizeTwinkling);
    }
  );

  // 2s 之后开始爆炸
  const explodingProgress = uProgress
    .remap(0.4, 1)
    .clamp(0, 1)
    .mul(aTimeMultiplier);

  // Material
  const material = new THREE.SpriteNodeMaterial({
    positionNode: positionNode(pos, explodingProgress),
    sizeAttenuation: true,
    transparent: true,
    colorNode: vec4(color(c), textureAlpha),
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    scaleNode: scaleNode(size, explodingProgress),
  });

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

  gsap.to(uProgress, {
    value: 1,
    duration: 5,
    ease: "linear",
    onComplete: () => {
      destroy();
    },
  });
};

const createRandomFirework = () => {
  const detail = Math.round(10 + Math.random() * 10);
  // ...
  const position = new THREE.Vector3(
    (Math.random() - 0.5) * 2,
    Math.random(),
    (Math.random() - 0.5) * 2
  );
  const size = 0.05 + Math.random() * 0.05;

  const texture = textures[Math.floor(Math.random() * textures.length)];

  const radius = 0.5 + Math.random();

  const color = new THREE.Color();
  color.setHSL(Math.random(), 1, 0.7);

  createFirework(detail, position, size, texture, radius, color);
};

window.addEventListener("click", createRandomFirework);

renderer.setAnimationLoop((t) => {
  // Update controls
  controls.update();

  // Render
  renderer.render(scene, camera);
});
