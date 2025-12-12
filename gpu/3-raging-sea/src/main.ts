import {
  LinearToneMapping,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Vector2,
} from "three";
import {WebGPURenderer} from "three/webgpu";
import {getMaterial} from "./utils/getMaterial";
import {OrbitControls} from "three/examples/jsm/Addons.js";
import {uniform} from "three/tsl";
import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";

const gui = new GUI({width: 300});

const uBigWavesElevation = uniform(0.2);

const uBigWavesFrequency = uniform(new Vector2(4, 1.5));

const uBigWavesSpeed = uniform(0.75);

gui
  .add(uBigWavesElevation, "value")
  .min(0)
  .max(1)
  .step(0.001)
  .name("uBigWavesElevation");

gui
  .add(uBigWavesFrequency.value, "x")
  .min(0)
  .max(10)
  .step(0.001)
  .name("uBigWavesFrequencyX");

gui
  .add(uBigWavesFrequency.value, "y")
  .min(0)
  .max(10)
  .step(0.001)
  .name("uBigWavesFrequencyY");

gui
  .add(uBigWavesSpeed, "value")
  .min(0)
  .max(4)
  .step(0.001)
  .name("uBigWavesSpeed");

async function boot() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const renderer = new WebGPURenderer({
    antialias: true,
    alpha: true,
  });

  await renderer.init(); // WebGPU 需显式初始化

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = LinearToneMapping;
  container.appendChild(renderer.domElement);

  // 场景和相机
  const scene = new Scene();
  const camera = new PerspectiveCamera(
    50,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );
  camera.position.set(1, 1, 1);

  // 几何 + 最小 TSL 节点材质；随时间变色
  const geometry = new PlaneGeometry(2, 2, 512, 512);
  const material = getMaterial({
    uBigWavesElevation,
    uBigWavesFrequency,
    uBigWavesSpeed,
  });

  const water = new Mesh(geometry, material);

  water.rotation.x = -Math.PI * 0.5;

  scene.add(water);

  // controls
  const controls = new OrbitControls(camera, renderer.domElement);

  controls.enableDamping = true;

  // 自适应
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener("resize", resize);

  // 动画循环
  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });
}

boot();
