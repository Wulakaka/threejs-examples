import * as THREE from "three/webgpu";
import {
  vec4,
  storage,
  Fn,
  If,
  uniform,
  instanceIndex,
  objectWorldMatrix,
  color,
  screenUV,
  attribute,
} from "three/tsl";

import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";

import {OrbitControls} from "three/addons/controls/OrbitControls.js";

import {Inspector} from "three/addons/inspector/Inspector.js";

let camera: THREE.PerspectiveCamera,
  scene: THREE.Scene,
  renderer: THREE.WebGPURenderer;
let raycaster: THREE.Raycaster, pointer: THREE.Vector2;

let mesh;

const pointerPosition = uniform(vec4(0));
// 弹力系数
const elasticity = uniform(0.4); // elasticity ( how "strong" the spring is )
const damping = uniform(0.94); // damping factor ( energy loss )
const brushSize = uniform(0.25);
const brushStrength = uniform(0.22);

init();

// geometryNode 默认会传递 renderer、 geometry、 object，可能还有其他的
// TODO 这里没有使用 renderer.compute(updateCompute) 的方式是为什么？
const jelly = Fn(({renderer, geometry, object}) => {
  const count = geometry.attributes.position.count;

  // Create storage buffer attribute for modified position.

  // 原始位置信息
  const positionBaseAttribute = geometry.attributes
    .position as THREE.BufferAttribute;

  // 最终显示的位置
  const positionStorageBufferAttribute = new THREE.StorageBufferAttribute(
    count,
    3
  );
  const speedBufferAttribute = new THREE.StorageBufferAttribute(count, 3);

  // 存储到 geometry 的 attribute 中，这样在设置 positionNode 时可以直接用 attribute("storagePosition")
  geometry.setAttribute("storagePosition", positionStorageBufferAttribute);

  // Attributes
  // 转换为 storage buffer， 以便在 compute shader 中读写
  // 不转换的话只能读取，不能写入
  const positionAttribute = storage(positionBaseAttribute, "vec3", count);
  const positionStorageAttribute = storage(
    positionStorageBufferAttribute,
    "vec3",
    count
  );

  const speedAttribute = storage(speedBufferAttribute, "vec3", count);

  // Vectors

  // Base vec3 position of the mesh vertices.
  const basePosition = positionAttribute.element(instanceIndex);
  // Mesh vertices after compute modification.
  const currentPosition = positionStorageAttribute.element(instanceIndex);
  // Speed of each mesh vertex.
  const currentSpeed = speedAttribute.element(instanceIndex);

  //

  const computeInit = Fn(() => {
    // Modified storage position starts out the same as the base position.
    // 翻译：初始化原始位置
    currentPosition.assign(basePosition);
  })().compute(count);

  //

  const computeUpdate = Fn(() => {
    // pinch
    // 捏取效果

    // 通过 w 通道判断是否启用捏取效果
    If(pointerPosition.w.equal(1), () => {
      // 创建世界矩阵，再乘以当前顶点位置，得到顶点的世界位置
      const worldPosition = objectWorldMatrix(object).mul(currentPosition);

      // 指针到顶点的距离
      const dist = worldPosition.distance(pointerPosition.xyz);
      // 指向 pointer 的方向
      const direction = pointerPosition.xyz.sub(worldPosition).normalize();

      // brushSize 内的才有 power
      const power = brushSize.sub(dist).max(0).mul(brushStrength);

      currentPosition.addAssign(direction.mul(power));
    });

    // compute ( jelly )

    // 距离初始位置
    const distance = basePosition.distance(currentPosition);
    // 力等于弹力系数乘以距离，再乘以方向向量
    // TODO 这里的方向如果 normalize 将不会渲染图形，为什么？
    const force = elasticity
      .mul(distance)
      .mul(basePosition.sub(currentPosition));

    // += force
    currentSpeed.addAssign(force);
    // *= damping
    currentSpeed.mulAssign(damping);

    // position += speed
    currentPosition.addAssign(currentSpeed);
  })()
    .compute(count)
    .setName("Update Jelly");

  // initialize the storage buffer with the base position

  computeUpdate.onInit(() => renderer.compute(computeInit));

  //

  return computeUpdate;
});

function init() {
  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    10
  );
  camera.position.set(0, 0, 1);

  scene = new THREE.Scene();

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  // background

  const bgColor = screenUV.y.mix(color(0x9f87f7), color(0xf2cdcd));
  // 只取距离中心 0.3 到 0.8 之间的值，并且映射为 0 到 1，再反转
  // 中心为 1，边缘为 0
  const bgVignette = screenUV.distance(0.5).remapClamp(0.3, 0.8).oneMinus();
  const bgIntensity = 4;

  // 用两个颜色相乘
  scene.backgroundNode = bgColor.mul(
    bgVignette.mul(color(0xa78ff6).mul(bgIntensity))
  );

  // model

  new GLTFLoader().load(
    "/models/gltf/LeePerrySmith/LeePerrySmith.glb",
    function (gltf) {
      // create jelly effect material

      const material = new THREE.MeshNormalNodeMaterial();
      material.geometryNode = jelly();
      // 因为前面将 storagePosition 存储到了 geometry 的属性中
      material.positionNode = attribute("storagePosition");

      // apply the material to the mesh

      mesh = gltf.scene.children[0] as THREE.Mesh;
      mesh.scale.setScalar(0.1);
      mesh.material = material;
      scene.add(mesh);
    }
  );

  // renderer

  renderer = new THREE.WebGPURenderer({antialias: true});
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.inspector = new Inspector();
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 0.7;
  controls.maxDistance = 2;

  const gui = (<Inspector>renderer.inspector).createParameters("Settings");
  gui.add(elasticity, "value", 0, 0.5).name("elasticity");
  gui.add(damping, "value", 0.9, 0.98).name("damping");
  gui.add(brushSize, "value", 0.1, 0.5).name("brush size");
  gui.add(brushStrength, "value", 0.1, 0.3).name("brush strength");

  window.addEventListener("resize", onWindowResize);
  window.addEventListener("pointermove", onPointerMove);
}

function onPointerMove(event: PointerEvent) {
  pointer.set(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );

  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObject(scene);

  if (intersects.length > 0) {
    const intersect = intersects[0];

    pointerPosition.value.copy(new THREE.Vector4(...intersect.point, 0));
    pointerPosition.value.w = 1; // enable
  } else {
    pointerPosition.value.w = 0; // disable
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

async function animate() {
  renderer.render(scene, camera);
}
