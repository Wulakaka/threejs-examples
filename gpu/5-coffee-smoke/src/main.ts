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
import model from "@/assets/bakedModel.glb?url";
import img from "@/assets/perlin.png";
import gsap from "gsap";

const gui = new GUI();

const smokeSpeed = uniform(0.005);
const smokePatternSpeed = uniform(0.03);

const smokeColor = uniform(new THREE.Color(0.6, 0.3, 0.2), "color");

const windDirection = uniform(0.0, "float");
const windStrength = uniform(0.0, "float");

gui.add(smokeSpeed, "value", 0, 1, 0.001).name("Smoke Speed");
gui.add(smokePatternSpeed, "value", 0, 1, 0.001).name("Smoke Pattern Speed");

gui.addColor(smokeColor, "value").name("Smoke Color");

gui.add(windDirection, "value", -Math.PI, Math.PI, 0.01).name("Wind Direction");
gui.add(windStrength, "value", 0, 1, 0.01).name("Wind Strength");

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

window.addEventListener("mousemove", (e) => {
  const x = e.clientX - window.innerWidth / 2;
  const y = -(e.clientY - window.innerHeight / 2);
  const angle = Math.atan2(y, x);
  gsap.to(windDirection, {
    value: angle,
    duration: 5,
  });

  const strength = Math.sqrt(
    Math.pow(x / (window.innerWidth / 2), 2) +
      Math.pow(y / (window.innerHeight / 2), 2)
  );
  gsap.to(windStrength, {
    value: strength,
    duration: 5,
  });
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
  antialias: true,
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

const perlinTexture = textureLoader.load(img);
perlinTexture.wrapS = THREE.RepeatWrapping;
perlinTexture.wrapT = THREE.RepeatWrapping;

// Smoke
const smokeGeometry = new THREE.PlaneGeometry(1, 1, 16, 64);
smokeGeometry.translate(0, 0.5, 0);
smokeGeometry.scale(1.5, 6, 1.5);

const colorNode = Fn(() => {
  // Scale and animate
  const uvX = uv().x.mul(0.5);
  const uvY = uv().y.mul(0.3).sub(time.mul(smokePatternSpeed));

  const smokeUv = vec2(uvX, uvY);

  const smoke = texture(perlinTexture, smokeUv).x.smoothstep(0.4, 1.0);
  smoke
    .mulAssign(smoothstep(0, 0.1, uv().x))
    .mulAssign(smoothstep(1, 0.9, uv().x))
    .mulAssign(smoothstep(0, 0.1, uv().y))
    .mulAssign(smoothstep(1, 0.4, uv().y));

  return vec4(smokeColor, smoke);
});

const positionNode = Fn(() => {
  // Twist
  const twistPerlin = texture(
    perlinTexture,
    vec2(0.5, uv().y.mul(0.2).sub(time.mul(smokeSpeed)))
  ).x;
  const angle = twistPerlin.sub(0.5).mul(10);
  // xz 平面旋转
  const xz = rotate(positionLocal.xz, angle);

  const cameraAngle = atan(cameraPosition.z, cameraPosition.x);

  // Wind
  const windOffset = vec2(
    texture(perlinTexture, vec2(0.25, time.mul(0.01)))
      .x.sub(0.5)
      .add(
        cos(cameraAngle.sub(windDirection).add(Math.PI / 2))
          .mul(windStrength)
          .mul(0.5)
      ),
    texture(perlinTexture, vec2(0.75, time.mul(0.01)))
      .x.sub(0.5)
      .add(
        sin(cameraAngle.sub(windDirection).add(Math.PI / 2))
          .mul(windStrength)
          .mul(0.5)
      )
  );

  // y 越高，风力越大
  windOffset.mulAssign(uv().y.pow(2).mul(10));

  xz.addAssign(windOffset);

  return vec3(xz.x, positionLocal.y, xz.y);
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
