import * as THREE from "three";
import { GLTFLoader, SkeletonUtils } from "three/examples/jsm/Addons.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { GLTF } from "three/examples/jsm/Addons.js";

import "./style.css";

const canvas = document.querySelector("#c") as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });

const fov = 45;
const aspect = 2; // the canvas default
const near = 0.1;
const far = 100;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.set(0, 20, 40);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 5, 0);
controls.update();

const scene = new THREE.Scene();
scene.background = new THREE.Color("white");

function addLight(...pos: [number, number, number]) {
  const color = 0xffffff;
  const intensity = 2.5;
  const light = new THREE.DirectionalLight(color, intensity);
  light.position.set(...pos);
  scene.add(light);
  scene.add(light.target);
}

addLight(5, 5, 2);
addLight(-5, 5, 5);

const manager = new THREE.LoadingManager();
manager.onLoad = init;

const progressbarElem = document.querySelector(
  "#progressbar"
) as HTMLDivElement;
manager.onProgress = (url, itemsLoaded, itemsTotal) => {
  progressbarElem.style.width = `${(itemsLoaded / itemsTotal) * 100}%`;
};

const models: {
  [key: string]: {
    url: string;
    gltf?: GLTF;
    animations?: {
      [key: string]: THREE.AnimationClip;
    };
  };
} = {
  pig: { url: "/models/animals/Pig.glb" },
  cow: { url: "/models/animals/Cow.glb" },
  llama: { url: "/models/animals/Llama.glb" },
  pug: { url: "/models/animals/Pug.glb" },
  sheep: { url: "/models/animals/Sheep.glb" },
  zebra: { url: "/models/animals/Zebra.glb" },
  horse: { url: "/models/animals/Horse.glb" },
  knight: { url: "/models/knight/KnightCharacter.glb" },
};
{
  const gltfLoader = new GLTFLoader(manager);
  for (const model of Object.values(models)) {
    gltfLoader.load(model.url, (gltf) => {
      model.gltf = gltf;
    });
  }
}

function prepModelsAndAnimations() {
  Object.values(models).forEach((model) => {
    const animsByName: {
      [key: string]: THREE.AnimationClip;
    } = {};
    model.gltf?.animations.forEach((clip) => {
      animsByName[clip.name] = clip;
    });
    model.animations = animsByName;
  });
}

const mixers: THREE.AnimationMixer[] = [];

function init() {
  // hide the loading bar 隐藏加载条
  const loadingElem = document.querySelector("#loading") as HTMLDivElement;
  loadingElem.style.display = "none";

  // 准备模型动画
  prepModelsAndAnimations();

  // 加载所有模型到场景中
  Object.values(models).forEach((model, ndx) => {
    // SkeletonUnits 是一个工具类，用于克隆带有骨骼动画的模型
    const clonedScene = SkeletonUtils.clone(model.gltf?.scene!);
    // 为什么需要将模型添加到一个新的Object3D中？
    // 文档中说是为了避免无法控制动画
    const root = new THREE.Object3D();
    root.add(clonedScene);
    scene.add(root);
    root.position.x = (ndx % 3) * 3;

    const mixer = new THREE.AnimationMixer(clonedScene);
    const firstClip = Object.values(model.animations!)[0];
    const action = mixer.clipAction(firstClip);
    action.play();
    mixers.push(mixer);
  });
}

function resizeRendererToDisplaySize(renderer: THREE.WebGLRenderer) {
  const canvas = renderer.domElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) {
    renderer.setSize(width, height, false);
  }

  return needResize;
}

let then = 0;
function render(now: number) {
  now *= 0.001; // convert to seconds
  const delta = now - then;
  then = now;

  if (resizeRendererToDisplaySize(renderer)) {
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }

  // 更新所有动画混合器
  for (const mixer of mixers) {
    mixer.update(delta);
  }

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

requestAnimationFrame(render);
