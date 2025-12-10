import {Mesh, PerspectiveCamera, PlaneGeometry, Scene} from "three";
import {WebGPURenderer} from "three/webgpu";
import {getMaterial} from "./utils/getMaterial";

async function boot() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  let renderer: WebGPURenderer;

  renderer = new WebGPURenderer({
    antialias: true,
    alpha: true,
  });

  await renderer.init(); // WebGPU 需显式初始化

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // 场景和相机
  const scene = new Scene();
  const camera = new PerspectiveCamera(
    50,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );
  camera.position.z = 2.5;

  // 几何 + 最小 TSL 节点材质；随时间变色
  const geometry = new PlaneGeometry(2, 2);
  const material = getMaterial();

  scene.add(new Mesh(geometry, material));

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
  renderer.setAnimationLoop(() => renderer.render(scene, camera));
}

boot();
