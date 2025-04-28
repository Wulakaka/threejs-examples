import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/Addons.js";
import "./style.css";

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
function init() {
  // hide the loading bar 隐藏加载条
  const loadingElem = document.querySelector("#loading") as HTMLDivElement;
  loadingElem.style.display = "none";
}
