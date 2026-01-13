import * as THREE from "three/webgpu";
import {
  time,
  mx_noise_vec3,
  instanceIndex,
  textureStore,
  float,
  vec3,
  vec4,
  If,
  Break,
  Fn,
  smoothstep,
  texture3D,
  uniform,
  sub,
} from "three/tsl";

import {RaymarchingBox} from "three/addons/tsl/utils/Raymarching.js";

import {OrbitControls} from "three/addons/controls/OrbitControls.js";

import {Inspector} from "three/addons/inspector/Inspector.js";

let renderer: THREE.WebGPURenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera;
let mesh: THREE.Mesh;
let computeNode: THREE.ComputeNode;

init();

async function init() {
  renderer = new THREE.WebGPURenderer({antialias: true});
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.inspector = new Inspector();
  document.body.appendChild(renderer.domElement);

  await renderer.init();

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 1, 1.5);

  new OrbitControls(camera, renderer.domElement);

  // Sky

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 32;

  const context = canvas.getContext("2d")!;
  const gradient = context.createLinearGradient(0, 0, 0, 32);
  gradient.addColorStop(0.0, "#014a84");
  gradient.addColorStop(0.5, "#0561a0");
  gradient.addColorStop(1.0, "#437ab6");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1, 32);

  const skyMap = new THREE.CanvasTexture(canvas);
  skyMap.colorSpace = THREE.SRGBColorSpace;

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(10),
    new THREE.MeshBasicNodeMaterial({map: skyMap, side: THREE.BackSide})
  );
  scene.add(sky);

  // Texture

  const size = 200;

  const computeCloud = Fn(
    ({storageTexture}: {storageTexture: THREE.Storage3DTexture}) => {
      const scale = float(0.05);
      const id = instanceIndex;

      const x = id.mod(size);
      const y = id.div(size).mod(size);
      const z = id.div(size * size);

      const coord3d = vec3(x, y, z);
      // (-0.5,-0.5,-0.5) 到 (0.5,0.5,0.5)
      const centered = coord3d.sub(size / 2).div(size);
      // 最中心为 1
      const d = float(1.0).sub(centered.length());

      const noiseCoord = coord3d.mul(scale.div(1.5)).add(time);

      // vec3 的 noise
      const noise = mx_noise_vec3(noiseCoord).toConst("noise");

      const data = noise.mul(d).mul(d).toConst("data");

      // 存储到 texture3D 中
      textureStore(storageTexture, vec3(x, y, z), vec4(vec3(data.x), 1.0));
    }
  );

  // 创建 Storage3DTexture
  const storageTexture = new THREE.Storage3DTexture(size, size, size);
  // 手动创建 mipmaps
  storageTexture.generateMipmaps = false;
  storageTexture.name = "cloud";

  computeNode = computeCloud({storageTexture})
    .compute(size * size * size)
    .setName("computeCloud");

  // Shader

  const transparentRaymarchingTexture = Fn(
    ({
      texture,
      range = float(0.14),
      threshold = float(0.08),
      opacity = float(0.18),
      steps = float(100),
    }: {
      texture: THREE.TextureNode;
      range?: THREE.ConstNode<number>;
      threshold?: THREE.ConstNode<number>;
      opacity?: THREE.ConstNode<number>;
      steps?: THREE.ConstNode<number>;
    }) => {
      const finalColor = vec4(0).toVar();

      RaymarchingBox(steps, ({positionRay}) => {
        // 因为 boxGeometry 的局部坐标是 -0.5 到 0.5，所以这里加 0.5 变成 0 到 1 的采样坐标
        const mapValue = float(texture.sample(positionRay.add(0.5)).r).toVar();

        // 0 - opacity
        mapValue.assign(
          smoothstep(threshold.sub(range), threshold.add(range), mapValue).mul(
            opacity
          )
        );

        // shading 明暗处理
        // 从左下 vec3(-0.5) 到右上 vec3(0.5)
        // 如果采样值开始变大，说明是云底层，需要变暗，则 shading 为负
        // 如果采样值变小，说明是云顶层，需要变亮，则 shading 为正
        const shading = sub(
          texture.sample(positionRay.add(0.5)).r,
          texture.sample(positionRay.add(0.5).add(0.01)).r
        );

        // col 表示附加颜色
        // col = shading * 4 + (positionRay.x + positionRay.y) * 0.5 + 0.3
        // (positionRay.x + positionRay.y) * 0.5 范围是 -0.5 到 0.5
        // 也就是越靠近右上，附加的颜色值越多
        const col = shading
          .mul(4.0)
          .add(positionRay.x.add(positionRay.y).mul(0.5))
          .add(0.3);

        // rgb += mapValue * (1 - alpha) * col
        // 1 - alpha 表示剩下的可见范围
        finalColor.rgb.addAssign(
          finalColor.a.oneMinus().mul(mapValue).mul(col)
        );

        // alpha += mapValue * (1 - alpha)
        // 这样 alpha 最大也就是 1.0
        finalColor.a.addAssign(finalColor.a.oneMinus().mul(mapValue));

        // alpha >= 0.95 退出循环
        If(finalColor.a.greaterThanEqual(0.95), () => {
          Break();
        });
      });

      return finalColor;
    }
  );

  // Material

  const baseColor = uniform(new THREE.Color(0x798aa0));
  const range = uniform(0.1);
  const threshold = uniform(0.08);
  const opacity = uniform(0.08);
  const steps = uniform(100);

  const cloud3d = transparentRaymarchingTexture({
    texture: texture3D(storageTexture, null, 0),
    range,
    threshold,
    opacity,
    steps,
  });

  // cloud3d 从上到下由白到黑，叠加颜色可以出现渐变
  const finalCloud = cloud3d.setRGB(cloud3d.rgb.add(baseColor));

  // 这里只使用了 NodeMaterial
  const material = new THREE.NodeMaterial();
  material.colorNode = finalCloud;
  material.side = THREE.BackSide;
  material.transparent = true;
  material.name = "transparentRaymarchingMaterial";

  mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
  scene.add(mesh);

  // 旋转只是为了方便看
  mesh.rotation.y = Math.PI / 2;

  //

  renderer.compute(computeNode);

  const gui = (<Inspector>renderer.inspector).createParameters("Settings");
  gui.add(threshold, "value", 0, 1, 0.01).name("threshold");
  gui.add(opacity, "value", 0, 1, 0.01).name("opacity");
  gui.add(range, "value", 0, 1, 0.01).name("range");
  gui.add(steps, "value", 0, 200, 1).name("steps");
  gui.addColor(baseColor, "value").name("baseColor");

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  renderer.compute(computeNode);
  renderer.render(scene, camera);
}
