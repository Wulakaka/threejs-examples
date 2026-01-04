import gsap from "gsap";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {Inspector} from "three/examples/jsm/inspector/Inspector.js";
import {bloom} from "three/examples/jsm/tsl/display/BloomNode.js";
import {
  color,
  float,
  Fn,
  If,
  instancedBufferAttribute,
  luminance,
  min,
  mix,
  pass,
  pow,
  sin,
  step,
  texture,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import * as THREE from "three/webgpu";

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
renderer.inspector = new Inspector();

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

const from = new THREE.Vector3(0, -2, 0);
// const axesHelper = new THREE.AxesHelper();
// axesHelper.position.copy(from);
// scene.add(axesHelper);

const geometry = new THREE.IcosahedronGeometry(1, 15);

const positionArray = geometry.getAttribute("position").array;
const count = geometry.getAttribute("position").count;

const randomArray = new Float32Array(count);
const timeMultipliersArray = new Float32Array(count);
const indexArray = new Float32Array(count);

const offset = 0.15;

for (let i = 0; i < count; i++) {
  const i3 = i * 3;
  positionArray[i3 + 0] += Math.random() * offset;
  positionArray[i3 + 1] += Math.random() * offset;
  positionArray[i3 + 2] += Math.random() * offset;

  randomArray[i] = Math.random();

  timeMultipliersArray[i] = 1 + Math.random();

  indexArray[i] = i;
}

const positionAttribute = new THREE.InstancedBufferAttribute(positionArray, 3);
const randomAttribute = new THREE.InstancedBufferAttribute(randomArray, 1);

const timeMultipliersAttribute = new THREE.InstancedBufferAttribute(
  timeMultipliersArray,
  1
);

const indexAttribute = new THREE.InstancedBufferAttribute(indexArray, 1);

const pos = instancedBufferAttribute(positionAttribute);

// 0-1
const aRandom = instancedBufferAttribute(randomAttribute);

const aTimeMultiplier = instancedBufferAttribute(timeMultipliersAttribute);

const aIndex = instancedBufferAttribute(indexAttribute);

const createFirework = (
  position: THREE.Vector3,
  size: number,
  map: THREE.Texture,
  radius: number,
  c: THREE.Color
) => {
  const uProgress = uniform(0);

  const textureAlpha = texture(map, uv()).r;

  const shootingPos = Fn(
    ({
      progress,
      start,
      target,
    }: {
      progress: ReturnType<typeof float>;
      start: ReturnType<typeof vec3>;
      target: ReturnType<typeof vec3>;
    }) => {
      const x = mix(start.x, target.x, progress);
      const z = mix(start.z, target.z, progress);
      // Parabola
      const strength = start.y.sub(target.y);
      const y = strength.mul(progress.sub(1).pow(2)).add(target.y);
      return vec3(x, y, z);
    }
  );

  const explodingPos = Fn(
    ({
      localPos,
      positionOffset,
      progress,
    }: {
      localPos: ReturnType<typeof vec3>;
      positionOffset: ReturnType<typeof vec3>;
      progress: ReturnType<typeof float>;
    }) => {
      const p = localPos.mul(vec3(radius)).toVar();

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

      return p.add(positionOffset);
    }
  );

  const getPos = Fn(
    ({
      localPos,
      progress,
      target,
      from,
    }: {
      localPos: ReturnType<typeof vec3>;
      progress: ReturnType<typeof float>;
      target: ReturnType<typeof vec3>;
      from: ReturnType<typeof vec3>;
    }) => {
      const p = pos.toVar();
      If(progress.lessThan(0.4), () => {
        const shootingProgress = progress.remap(0, 0.4).clamp(0, 1);

        p.assign(
          shootingPos({
            progress: shootingProgress,
            start: from,
            target: target,
          })
        );
      }).Else(() => {
        const explodingProgress = progress
          .remap(0.4, 1)
          .clamp(0, 1)
          .mul(aTimeMultiplier);

        p.assign(
          explodingPos({
            localPos,
            positionOffset: target,
            progress: explodingProgress,
          })
        );
      });
      return p;
    }
  );

  const explodingScale = Fn(
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

  const getScale = Fn(
    ({
      progress,
      size,
    }: {
      progress: ReturnType<typeof float>;
      size: ReturnType<typeof float>;
    }) => {
      const p = progress.toVar();
      const scale = float();
      If(p.lessThan(0.4), () => {
        const progress = p.remap(0, 0.4).clamp(0, 1);
        const fromProgress = progress.remap(0, 0.1).clamp(0, 1).pow(2);
        const toProgress = progress
          .remap(0.1, 0.8)
          .clamp(0, 1)
          .pow(2)
          .oneMinus();

        scale.assign(float(0.05).mul(mix(fromProgress, toProgress, progress)));
      }).Else(() => {
        const explodingProgress = p
          .remap(0.4, 1)
          .clamp(0, 1)
          .mul(aTimeMultiplier);
        scale.assign(explodingScale(float(size), explodingProgress));
      });
      return scale;
    }
  );

  const getColor = Fn(
    ({
      progress,
      baseColor,
      alpha,
    }: {
      progress: ReturnType<typeof float>;
      baseColor: ReturnType<typeof vec4>;
      alpha: ReturnType<typeof float>;
    }) => {
      const shootingStrength = uv()
        .sub(vec2(0.5))
        .length()
        .step(0.5)
        .oneMinus();
      const shootingAlpha = step(0.5, aIndex).oneMinus();
      const shootingColor = vec4(
        baseColor,
        shootingAlpha.mul(shootingStrength)
      );
      const shootingLuminance = luminance(shootingColor.rgb);
      shootingColor.assign(shootingColor.div(shootingLuminance).mul(1.2));

      const explodingColor = vec4(baseColor, alpha).toVar();
      const explodingLuminance = luminance(explodingColor.rgb);
      explodingColor.assign(explodingColor.div(explodingLuminance).mul(1.1));

      return mix(shootingColor, explodingColor, progress.step(0.4));
    }
  );

  // Material
  const material = new THREE.SpriteNodeMaterial({
    positionNode: getPos({
      localPos: pos,
      progress: uProgress,
      target: vec3(position),
      from: vec3(from),
    }),
    sizeAttenuation: true,
    transparent: true,
    colorNode: getColor({
      progress: uProgress,
      baseColor: color(c),
      alpha: textureAlpha,
    }),
    depthWrite: false,
    // blending: THREE.AdditiveBlending,
    scaleNode: getScale({progress: uProgress, size}),
  });

  // Points
  const firework = new THREE.Sprite(material);
  // 需要指定 count 才有效果
  firework.count = count;
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

  createFirework(position, size, texture, radius, color);
};

window.addEventListener("click", createRandomFirework);

const postProcessing = new THREE.PostProcessing(renderer);

const scenePass = pass(scene, camera);

const scenePassColor = scenePass.getTextureNode();

const bloomPass = bloom(scenePassColor, 1, 0.05, 1);

postProcessing.outputNode = scenePassColor.add(bloomPass);

renderer.setAnimationLoop((t) => {
  // Update controls
  controls.update();

  // Render
  // renderer.render(scene, camera);
  postProcessing.render();
});
