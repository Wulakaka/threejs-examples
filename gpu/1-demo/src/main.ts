import {
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  RepeatWrapping,
  Scene,
  SphereGeometry,
  TextureLoader,
} from "three";
import {MeshBasicNodeMaterial, WebGPURenderer} from "three/webgpu";
import {OrbitControls} from "three/examples/jsm/Addons.js";
import {
  atan,
  color,
  float,
  Fn,
  min,
  PI,
  PI2,
  texture,
  time,
  uv,
  vec2,
  vec4,
} from "three/tsl";

const textureLoader = new TextureLoader();

const perlinNoiseTexture = textureLoader.load("/rgb-256x256.png");
perlinNoiseTexture.wrapS = RepeatWrapping;
perlinNoiseTexture.wrapT = RepeatWrapping;

async function boot() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  let renderer: WebGPURenderer;

  renderer = new WebGPURenderer({
    antialias: true,
    alpha: true,
  });

  // await renderer.init(); // WebGPU 需显式初始化

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor("#a59f9f");
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

  // controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // 几何 + 最小 TSL 节点材质；随时间变色
  const geometry = new SphereGeometry(1, 32, 32);

  const toRadialUv = Fn(
    ([uv, multiplier, rotation, offset]: [
      ReturnType<typeof vec2>,
      ReturnType<typeof vec2>,
      ReturnType<typeof float>,
      ReturnType<typeof float>,
    ]) => {
      const centeredUv = uv.sub(vec2(0.5));
      const angle = atan(centeredUv.y, centeredUv.x).add(PI).div(PI2);
      const distanceToCenter = centeredUv.length();
      const radialUv = vec2(angle, distanceToCenter);
      radialUv.mulAssign(multiplier);
      radialUv.x.addAssign(rotation);
      radialUv.y.addAssign(offset);
      return radialUv;
    }
  );

  const toSkewedUv = Fn(
    ([uv, skew]: [ReturnType<typeof vec2>, ReturnType<typeof vec2>]) => {
      return vec2(uv.x.add(uv.y.mul(skew.x)), uv.y.add(uv.x.mul(skew.y)));
    }
  );

  const material = new MeshBasicNodeMaterial({
    transparent: true,
  });

  material.outputNode = Fn(() => {
    const scaledTime = time.mul(0.01);
    const newUv = uv().add(vec2(scaledTime.negate(), 0));
    newUv.assign(toSkewedUv(newUv, vec2(-1, 0)));
    newUv.mulAssign(vec2(4, 1));
    const noise = texture(perlinNoiseTexture, newUv, 1).r.remap(0.45, 0.7);

    const distanceToCenter = uv().sub(vec2(0.5)).length();

    const outerFade = min(
      distanceToCenter.oneMinus().smoothstep(0.5, 0.9),
      distanceToCenter.smoothstep(0.0, 0.2)
    );

    const effect = noise.mul(outerFade);

    return vec4(color("hotpink").mul(noise.step(0.15)).mul(3), 1);
  })();

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
  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });
}

boot();
