import * as THREE from "three";
import { GLTFLoader, SkeletonUtils } from "three/examples/jsm/Addons.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import "./style.css";
import { globals, inputManager, gameObjectManager, scene } from "./globals";
import { Player } from "./Player";
import { Model } from "./types/Model";
import { CameraInfo } from "./CameraInfo";
import { Animal } from "./Animal";

const canvas = document.querySelector("#c") as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });

const fov = 45;
const aspect = 2; // the canvas default
const near = 0.1;
const far = 100;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.set(0, 20, 40);
globals.camera = camera;
globals.canvas = canvas;

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 5, 0);
controls.update();

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
manager.onProgress = (_, itemsLoaded, itemsTotal) => {
  progressbarElem.style.width = `${(itemsLoaded / itemsTotal) * 100}%`;
};

const models: {
  [key: string]: Model;
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
  const box = new THREE.Box3();
  const size = new THREE.Vector3();
  Object.values(models).forEach((model) => {
    box.setFromObject(model.gltf?.scene!);
    box.getSize(size);
    model.size = size.length();
    // console.log("------->:", model.url);
    const animsByName: {
      [key: string]: THREE.AnimationClip;
    } = {};
    model.gltf?.animations.forEach((clip) => {
      animsByName[clip.name] = clip;
      // console.log("  ", clip.name);
    });
    model.animations = animsByName;
  });
}

interface MixerInfo {
  mixer: THREE.AnimationMixer;
  actions: THREE.AnimationAction[];
  actionNdx: number;
}

const mixerInfos: MixerInfo[] = [];

function init() {
  // hide the loading bar 隐藏加载条
  const loadingElem = document.querySelector("#loading") as HTMLDivElement;
  loadingElem.style.display = "none";

  // 准备模型动画
  prepModelsAndAnimations();

  {
    const gameObject = gameObjectManager.createGameObject(scene, "camera");
    // cameraInfo 是一个组件，用于更新相机的投影矩阵和视锥体
    globals.cameraInfo = gameObject.addComponent(CameraInfo);
  }

  {
    const gameObject = gameObjectManager.createGameObject(scene, "player");
    globals.player = gameObject.addComponent(Player, models);
    globals.congaLine = [gameObject];
  }

  const animalModelNames = [
    "pig",
    "cow",
    "llama",
    "pug",
    "sheep",
    "zebra",
    "horse",
  ];

  animalModelNames.forEach((name, ndx) => {
    const gameObject = gameObjectManager.createGameObject(scene, name);
    gameObject.addComponent(Animal, models[name]);
    gameObject.transform.position.x = (ndx + 1) * 5;
  });

  // 加载所有模型到场景中
  Object.values(models).forEach((model, ndx) => {
    // SkeletonUnits 是一个工具类，用于克隆带有骨骼动画的模型
    const clonedScene = SkeletonUtils.clone(model.gltf?.scene!);
    // 为什么需要将模型添加到一个新的Object3D中？
    // 文档中说是为了避免无法控制动画
    const root = new THREE.Object3D();
    root.add(clonedScene);
    // scene.add(root);
    // root.position.x = (ndx - 3) * 3;

    const mixer = new THREE.AnimationMixer(clonedScene);
    const actions = Object.values(model.animations!).map((clip) =>
      mixer.clipAction(clip)
    );
    const mixerInfo: MixerInfo = {
      mixer,
      actions,
      actionNdx: -1,
    };
    mixerInfos.push(mixerInfo);
    playNextAction(mixerInfo);
  });
}

function playNextAction(mixerInfo: MixerInfo) {
  const { actions, actionNdx } = mixerInfo;
  const nextActionNdx = (actionNdx + 1) % actions.length;
  mixerInfo.actionNdx = nextActionNdx;
  actions.forEach((action, ndx) => {
    const enabled = ndx === nextActionNdx;
    action.enabled = enabled;
    if (enabled) {
      action.play();
    }
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
  // convert to seconds
  globals.time = now * 0.001;
  // make sure deltaTime is isn't too big
  // 避免 deltaTime 太大导致动画变动太多
  globals.deltaTime = Math.min(globals.time - then, 1 / 20);
  then = globals.deltaTime;

  if (resizeRendererToDisplaySize(renderer)) {
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }

  // 更新动画
  gameObjectManager.update();
  // 更新输入管理器
  // 必须在 gameObjectManager.update() 之后调用，否则 justPressed 永远为 false
  inputManager.update();

  // controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

window.addEventListener("keydown", (e) => {
  const mixerInfo = mixerInfos[e.keyCode - 49];
  if (!mixerInfo) return;
  playNextAction(mixerInfo);
});

requestAnimationFrame(render);
