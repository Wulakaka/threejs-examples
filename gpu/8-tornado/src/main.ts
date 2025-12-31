import * as THREE from "three/webgpu";
import {
  luminance,
  cos,
  min,
  time,
  atan,
  uniform,
  pass,
  PI,
  TWO_PI,
  color,
  positionLocal,
  sin,
  texture,
  Fn,
  uv,
  vec2,
  vec3,
  vec4,
  float,
} from "three/tsl";
import {bloom} from "three/addons/tsl/display/BloomNode.js";

import {OrbitControls} from "three/addons/controls/OrbitControls.js";

import {Inspector} from "three/addons/inspector/Inspector.js";
import {afterImage} from "three/examples/jsm/tsl/display/AfterImageNode.js";

let camera: THREE.PerspectiveCamera,
  scene: THREE.Scene,
  renderer: THREE.WebGPURenderer,
  postProcessing: THREE.PostProcessing,
  controls: OrbitControls;

init();

function init() {
  camera = new THREE.PerspectiveCamera(
    25,
    window.innerWidth / window.innerHeight,
    0.1,
    50
  );

  camera.position.set(1, 1, 6);

  scene = new THREE.Scene();

  // textures

  const textureLoader = new THREE.TextureLoader();
  const perlinNoiseTexture = textureLoader.load("/rgb-256x256.png");
  perlinNoiseTexture.wrapS = THREE.RepeatWrapping;
  perlinNoiseTexture.wrapT = THREE.RepeatWrapping;

  // TSL functions
  // 转变为径向 UV
  // return vec2,
  // x: angle 映射到 [0,multiplier.x],
  // y: 距离中心的距离 [0, sqrt(0.5) * multiplier.y]
  const toRadialUv = Fn(
    ([uv, multiplier, rotation, offset]: [
      ReturnType<typeof vec2>,
      ReturnType<typeof vec2>,
      ReturnType<typeof float>,
      ReturnType<typeof float>,
    ]) => {
      // 将 UV 转为中心在(0.5,0.5)的坐标系
      // toVar 是为了转换为可重用的变量
      // 这里不转换好像没有差异
      const centeredUv = uv.sub(0.5).toVar();
      // 距离中心的长度
      const distanceToCenter = centeredUv.length();
      // angle 任意一点与中心点的夹角
      const angle = atan(centeredUv.y, centeredUv.x);
      // 径向 UV 坐标，angle 映射到 [0,1]，distanceToCenter 保持不变
      // 左侧为 0
      const radialUv = vec2(
        angle.add(PI).div(TWO_PI),
        distanceToCenter
      ).toVar();

      // 乘以系数
      // multiplier 可以是 vec2，变换 x 和 y 分量
      radialUv.mulAssign(multiplier);
      // 增加旋转
      radialUv.x.addAssign(rotation);
      // 增加偏移
      radialUv.y.addAssign(offset);
      return radialUv;
    }
  );

  // 倾斜 UV
  const toSkewedUv = Fn(
    ([uv, skew]: [ReturnType<typeof vec2>, ReturnType<typeof vec2>]) => {
      return vec2(uv.x.add(uv.y.mul(skew.x)), uv.y.add(uv.x.mul(skew.y)));
    }
  );

  const twistedCylinder = Fn(
    ([position, parabolStrength, parabolOffset, parabolAmplitude, time]: [
      ReturnType<typeof vec3>,
      ReturnType<typeof float>,
      ReturnType<typeof float>,
      ReturnType<typeof float>,
      ReturnType<typeof float>,
    ]) => {
      // 在 xz 平面上计算
      const angle = atan(position.z, position.x).toVar();
      // 高度
      const elevation = position.y;

      // parabol 抛物线
      // radius = (strength * (y - offset))^2 + amplitude
      const radius = parabolStrength
        .mul(position.y.sub(parabolOffset))
        .pow(2)
        .add(parabolAmplitude)
        .toVar();

      // turbulence
      // 震荡
      radius.addAssign(
        // -0.05 到 0.05 的波动
        // sub time 是让波动向上移动
        // angle.mul(2) 是让同一高度出现两个波峰，类似椭圆，如果
        sin(elevation.sub(time).mul(20).add(angle.mul(2))).mul(0.05)
      );

      const twistedPosition = vec3(
        cos(angle).mul(radius),
        elevation,
        sin(angle).mul(radius)
      );
      return twistedPosition;
    }
  );

  // uniforms
  const emissiveColor = uniform(color("#ff8b4d"));
  const timeScale = uniform(0.2);
  // 抛物线变形系数
  const parabolStrength = uniform(1);
  // 抛物线最低点 y 位置
  const parabolOffset = uniform(0.3);
  // 抛物线最低位置的半径
  const parabolAmplitude = uniform(0.2);

  // tornado floor
  const floorMaterial = new THREE.MeshBasicNodeMaterial({
    transparent: true,
    wireframe: false,
  });

  // outputNode 可以传 alpha 通道
  floorMaterial.outputNode = Fn(() => {
    // 放缓时间
    const scaledTime = time.mul(timeScale);

    /**
     * noises
     * 通过两个 noise 的 x 一致，y 不一致制作错位的效果
     * 第三个参数让 uv 扩大，实现吸收的效果
     * 第四个参数实现旋转的效果
     */
    // noise 1
    const noise1Uv = toRadialUv(uv(), vec2(0.5, 0.5), scaledTime, scaledTime);
    // 倾斜以做出螺旋效果
    noise1Uv.assign(toSkewedUv(noise1Uv, vec2(-1, 0)));
    // 这里 x 如果不乘以 2 的倍数将会看到断裂，因为上面将 uv.x 映射到了 [0,0.5]
    noise1Uv.mulAssign(vec2(4, 1));
    // float
    // remap 将原值的 [0.45,0.7] 映射到 [0,1]
    const noise1 = texture(perlinNoiseTexture, noise1Uv, 1).r.remap(0.45, 0.7);

    // noise 2
    const noise2Uv = toRadialUv(
      uv(),
      vec2(2, 8),
      scaledTime.mul(2),
      scaledTime.mul(8)
    );
    noise2Uv.assign(toSkewedUv(noise2Uv, vec2(-0.25, 0)));
    noise2Uv.mulAssign(vec2(2, 0.25));
    const noise2 = texture(perlinNoiseTexture, noise2Uv, 1).b.remap(0.45, 0.7);

    /**
     * outer fade
     * 中心和边缘都变透明
     */
    const distanceToCenter = uv().sub(0.5).toVar();
    // 取小值
    const outerFade = min(
      distanceToCenter.length().oneMinus().smoothstep(0.5, 0.9),
      distanceToCenter.length().smoothstep(0, 0.2)
    );

    // effect
    // 叠加最亮的区域
    const effect = noise1.mul(noise2).mul(outerFade).toVar();

    /**
     * output
     * effect.step(0.2) 只要 effect 大于 0.2 就显示高亮色，小于则显示黑色，所以出现了黑色包裹亮色的效果
     * color 乘以 3 从颜色上没有意义，但是能让亮的区域更亮，从而更容易被 bloom 效果捕捉到
     * alpha 的区间很小是让只要有一点 effect 就显示
     */
    return vec4(
      emissiveColor.mul(effect.step(0.2)).mul(3), // Emissive
      // color("white"), // Emissive
      effect.smoothstep(0, 0.01) // Alpha
    );
  })();

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // tornado cylinder geometry
  const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 20, 20, true);
  // 向上平移 0.5，使底部在 y=0 处
  cylinderGeometry.translate(0, 0.5, 0);

  // tornado emissive cylinder

  const emissiveMaterial = new THREE.MeshBasicNodeMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    wireframe: false,
  });
  // 这里是 positionNode
  emissiveMaterial.positionNode = twistedCylinder(
    positionLocal,
    parabolStrength,
    parabolOffset,
    parabolAmplitude.sub(0.05), // 缩小一点
    time.mul(timeScale)
  );

  emissiveMaterial.outputNode = Fn(() => {
    const scaledTime = time.mul(timeScale);

    // noise 1
    // negate 就是添加负号
    const noise1Uv = uv().add(vec2(scaledTime, scaledTime.negate())).toVar();
    noise1Uv.assign(toSkewedUv(noise1Uv, vec2(-1, 0)));
    noise1Uv.mulAssign(vec2(2, 0.25));
    const noise1 = texture(perlinNoiseTexture, noise1Uv, 1).r.remap(0.45, 0.7);

    // noise 2
    const noise2Uv = uv()
      .add(vec2(scaledTime.mul(0.5), scaledTime.negate()))
      .toVar();
    noise2Uv.assign(toSkewedUv(noise2Uv, vec2(-1, 0)));
    noise2Uv.mulAssign(vec2(5, 1));
    const noise2 = texture(perlinNoiseTexture, noise2Uv, 1).g.remap(0.45, 0.7);

    // outer fade
    const outerFade = min(
      uv().y.smoothstep(0, 0.1),
      uv().y.oneMinus().smoothstep(0, 0.4)
    );

    const effect = noise1.mul(noise2).mul(outerFade);
    //  luminance 计算一个颜色的亮度值，返回 float
    const emissiveColorLuminance = luminance(emissiveColor);

    // output
    return vec4(
      // 除以亮度值是为了让亮度变成 1，从而不受 emissiveColor 本身亮度的影响
      // 再乘以 1.2 是为了让最终的亮度稍微高一点，因为 bloom 的阈值是 1
      emissiveColor.div(emissiveColorLuminance).mul(1.2), // Emissive
      effect.smoothstep(0, 0.1) // Alpha
    );
  })();

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicNodeMaterial({
      outputNode: emissiveMaterial.outputNode,
      transparent: true,
    })
  );
  plane.position.set(1.5, 0.5, 0);
  scene.add(plane);

  const emissive = new THREE.Mesh(cylinderGeometry, emissiveMaterial);
  emissive.scale.set(1, 1, 1);
  scene.add(emissive);

  // tornado dark cylinder
  const darkMaterial = new THREE.MeshBasicNodeMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    wireframe: false,
  });

  darkMaterial.positionNode = twistedCylinder(
    positionLocal,
    parabolStrength,
    parabolOffset,
    parabolAmplitude,
    time.mul(timeScale)
  );

  darkMaterial.outputNode = Fn(() => {
    // add 是为了偏移 uv
    const scaledTime = time.mul(timeScale).add(123.4);

    // noise 1
    const noise1Uv = uv().add(vec2(scaledTime, scaledTime.negate())).toVar();
    noise1Uv.assign(toSkewedUv(noise1Uv, vec2(-1, 0)));
    noise1Uv.mulAssign(vec2(2, 0.25));
    const noise1 = texture(perlinNoiseTexture, noise1Uv, 1).g.remap(0.45, 0.7);

    // noise 2
    const noise2Uv = uv()
      .add(vec2(scaledTime.mul(0.5), scaledTime.negate()))
      .toVar();
    noise2Uv.assign(toSkewedUv(noise2Uv, vec2(-1, 0)));
    noise2Uv.mulAssign(vec2(5, 1));
    const noise2 = texture(perlinNoiseTexture, noise2Uv, 1).b.remap(0.45, 0.7);

    // outer fade
    const outerFade = min(
      uv().y.smoothstep(0, 0.2),
      uv().y.oneMinus().smoothstep(0, 0.4)
    );

    // effect
    const effect = noise1.mul(noise2).mul(outerFade);

    return vec4(vec3(0), effect.smoothstep(0, 0.01));
  })();

  const dark = new THREE.Mesh(cylinderGeometry, darkMaterial);
  dark.scale.set(1, 1, 1);
  scene.add(dark);

  const emissiveBall = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 16, 16),
    new THREE.MeshBasicNodeMaterial({
      outputNode: emissiveMaterial.outputNode,
      transparent: true,
    })
  );

  emissiveBall.position.set(-1.5, 0.5, 0);
  scene.add(emissiveBall);

  const darkBall = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 16, 16),
    new THREE.MeshBasicNodeMaterial({
      outputNode: darkMaterial.outputNode,
      transparent: true,
    })
  );
  darkBall.position.copy(emissiveBall.position);
  scene.add(darkBall);

  // renderer
  renderer = new THREE.WebGPURenderer({antialias: true});
  renderer.setClearColor(0x201919);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.inspector = new Inspector();
  document.body.appendChild(renderer.domElement);

  // post processing
  postProcessing = new THREE.PostProcessing(renderer);

  // 创建 pass node
  const scenePass = pass(scene, camera);
  // Returns the texture node for the given output name.
  const scenePassColor = scenePass.getTextureNode("output");

  const bloomPass = bloom(scenePassColor, 1, 0.1, 1);

  const afterImagePass = afterImage(scenePassColor, 0.8);

  postProcessing.outputNode = scenePassColor.add(bloomPass).add(afterImagePass);

  // controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.y = 0.4;
  controls.enableDamping = true;
  controls.minDistance = 0.1;
  controls.maxDistance = 50;

  window.addEventListener("resize", onWindowResize);

  // debug
  const gui = (<Inspector>renderer.inspector).createParameters("Parameters");

  gui
    .addColor(
      {
        color: emissiveColor.value.getHexString(THREE.SRGBColorSpace),
      },
      "color"
    )
    .onChange((value) => emissiveColor.value.set(value))
    .name("emissiveColor");

  gui.add(timeScale, "value", -1, 1, 0.01).name("timeScale");
  gui.add(parabolStrength, "value", 0, 2, 0.01).name("parabolStrength");
  gui.add(parabolOffset, "value", 0, 1, 0.01).name("parabolOffset");
  gui.add(parabolAmplitude, "value", 0, 2, 0.01).name("parabolAmplitude");

  const bloomGui = gui.addFolder("bloom");
  bloomGui.add(bloomPass.strength, "value", 0, 10, 0.01).name("strength");
  bloomGui.add(bloomPass.radius, "value", 0, 1, 0.01).name("radius");
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

async function animate() {
  controls.update();

  // renderer.render(scene, camera);
  postProcessing.render();
}
