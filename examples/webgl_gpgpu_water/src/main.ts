import * as THREE from "three";

import Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import {
  GPUComputationRenderer,
  type Variable,
} from "three/addons/misc/GPUComputationRenderer.js";
import { SimplexNoise } from "three/addons/math/SimplexNoise.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

import "./style.css";
import smoothFragmentShader from "./shaders/smoothFragmentShader.glsl?raw";
import readWaterLevelFragmentShader from "./shaders/readWaterLevelFragmentShader.glsl?raw";

// Texture width for simulation
const WIDTH = 128;

// Water size in system units
const BOUNDS = 6;
const BOUNDS_HALF = BOUNDS * 0.5;

let tmpHeightmap: THREE.Texture | null = null;
const tmpQuat = new THREE.Quaternion();
const tmpQuatX = new THREE.Quaternion();
const tmpQuatZ = new THREE.Quaternion();
let duckModel: THREE.Mesh | null = null;

let container: HTMLDivElement, stats: Stats;
let camera: THREE.PerspectiveCamera,
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  controls: OrbitControls;
let mousedown = false;
const mouseCoords = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

let sun: THREE.DirectionalLight;
let waterMesh: THREE.Mesh<THREE.PlaneGeometry, WaterMaterial>;
let poolBorder: THREE.Mesh<THREE.TorusGeometry, THREE.MeshStandardMaterial>;
let meshRay: THREE.Mesh;
let gpuCompute: GPUComputationRenderer;
let heightmapVariable: Variable;
let smoothShader: THREE.ShaderMaterial;
let readWaterLevelShader: THREE.ShaderMaterial;
let readWaterLevelRenderTarget: THREE.WebGLRenderTarget<THREE.Texture>;
let readWaterLevelImage: Uint8Array;
const waterNormal = new THREE.Vector3();

const NUM_DUCK = 12;
const ducks: THREE.Mesh[] = [];
let ducksEnabled = true;

const simplex = new SimplexNoise();

let frame = 0;

const effectController = {
  mouseSize: 0.2,
  mouseDeep: 0.01,
  viscosity: 0.93,
  speed: 5,
  ducksEnabled: ducksEnabled,
  wireframe: false,
  shadow: false,
};

init();

async function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 2.0, 4);
  camera.lookAt(0, 0, 0);

  scene = new THREE.Scene();

  sun = new THREE.DirectionalLight(0xffffff, 4.0);
  sun.position.set(-1, 2.6, 1.4);
  scene.add(sun);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.5;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, container);

  stats = new Stats();
  container.appendChild(stats.dom);

  container.style.touchAction = "none";
  container.addEventListener("pointermove", onPointerMove);
  container.addEventListener("pointerdown", onPointerDown);
  container.addEventListener("pointerup", onPointerUp);

  window.addEventListener("resize", onWindowResize);

  const rgbeLoader = new RGBELoader().setPath("/textures/equirectangular/");
  const glbloader = new GLTFLoader().setPath("/models/gltf/");
  glbloader.setDRACOLoader(
    new DRACOLoader().setDecoderPath("/jsm/libs/draco/gltf/")
  );

  const [env, model] = await Promise.all([
    rgbeLoader.loadAsync("blouberg_sunrise_2_1k.hdr"),
    glbloader.loadAsync("duck.glb"),
  ]);
  env.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = env;
  scene.background = env;
  scene.backgroundBlurriness = 0.3;
  scene.environmentIntensity = 1.25;

  duckModel = model.scene.children[0] as THREE.Mesh;
  duckModel.receiveShadow = true;
  duckModel.castShadow = true;

  const gui = new GUI();
  gui.domElement.style.right = "0px";

  const valuesChanger = function () {
    heightmapVariable.material.uniforms["mouseSize"].value =
      effectController.mouseSize;
    heightmapVariable.material.uniforms["deep"].value =
      effectController.mouseDeep;
    heightmapVariable.material.uniforms["viscosity"].value =
      effectController.viscosity;
    ducksEnabled = effectController.ducksEnabled;

    let i = NUM_DUCK;
    while (i--) {
      if (ducks[i]) ducks[i].visible = ducksEnabled;
    }
  };

  gui.add(effectController, "mouseSize", 0.1, 1.0, 0.1).onChange(valuesChanger);
  gui
    .add(effectController, "mouseDeep", 0.01, 1.0, 0.01)
    .onChange(valuesChanger);
  gui
    .add(effectController, "viscosity", 0.9, 0.999, 0.001)
    .onChange(valuesChanger);
  gui.add(effectController, "speed", 1, 6, 1);
  gui.add(effectController, "ducksEnabled").onChange(valuesChanger);
  gui.add(effectController, "wireframe").onChange((v) => {
    waterMesh.material.wireframe = v;
    poolBorder.material.wireframe = v;
  });
  gui.add(effectController, "shadow").onChange(addShadow);

  const buttonSmooth = {
    smoothWater: function () {
      smoothWater();
    },
  };
  gui.add(buttonSmooth, "smoothWater");

  initWater();

  createducks();

  valuesChanger();

  renderer.setAnimationLoop(animate);
}

function initWater() {
  const geometry = new THREE.PlaneGeometry(
    BOUNDS,
    BOUNDS,
    WIDTH - 1,
    WIDTH - 1
  );

  const material = new WaterMaterial({
    color: 0x9bd2ec,
    metalness: 0.9,
    roughness: 0,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
  });

  waterMesh = new THREE.Mesh(geometry, material);
  waterMesh.rotation.x = -Math.PI * 0.5;
  waterMesh.matrixAutoUpdate = false;
  waterMesh.updateMatrix();

  waterMesh.receiveShadow = true;
  waterMesh.castShadow = true;

  scene.add(waterMesh);

  // pool border
  const borderGeom = new THREE.TorusGeometry(4.2, 0.1, 12, 4);
  borderGeom.rotateX(Math.PI * 0.5);
  borderGeom.rotateY(Math.PI * 0.25);
  poolBorder = new THREE.Mesh(
    borderGeom,
    new THREE.MeshStandardMaterial({ color: 0x908877, roughness: 0.2 })
  );
  scene.add(poolBorder);
  // @ts-ignore
  borderGeom.receiveShadow = true;
  // @ts-ignore
  borderGeom.castShadow = true;

  // THREE.Mesh just for mouse raycasting
  const geometryRay = new THREE.PlaneGeometry(BOUNDS, BOUNDS, 1, 1);
  meshRay = new THREE.Mesh(
    geometryRay,
    new THREE.MeshBasicMaterial({ color: 0xffffff, visible: false })
  );
  meshRay.rotation.x = -Math.PI / 2;
  meshRay.matrixAutoUpdate = false;
  meshRay.updateMatrix();
  scene.add(meshRay);

  // Creates the gpu computation class and sets it up

  gpuCompute = new GPUComputationRenderer(WIDTH, WIDTH, renderer);

  const heightmap0 = gpuCompute.createTexture();

  fillTexture(heightmap0);

  heightmapVariable = gpuCompute.addVariable(
    "heightmap",
    shaderChange.heightmap_frag,
    heightmap0
  );

  gpuCompute.setVariableDependencies(heightmapVariable, [heightmapVariable]);

  heightmapVariable.material.uniforms["mousePos"] = {
    value: new THREE.Vector2(10000, 10000),
  };
  heightmapVariable.material.uniforms["mouseSize"] = { value: 0.2 };
  heightmapVariable.material.uniforms["viscosity"] = { value: 0.93 };
  heightmapVariable.material.uniforms["deep"] = { value: 0.01 };
  heightmapVariable.material.defines.BOUNDS = BOUNDS.toFixed(1);

  const error = gpuCompute.init();
  if (error !== null) console.error(error);

  // Create compute shader to smooth the water surface and velocity
  smoothShader = gpuCompute.createShaderMaterial(smoothFragmentShader, {
    smoothTexture: { value: null },
  });

  // Create compute shader to read water level
  readWaterLevelShader = gpuCompute.createShaderMaterial(
    readWaterLevelFragmentShader,
    {
      point1: { value: new THREE.Vector2() },
      levelTexture: { value: null },
    }
  );
  readWaterLevelShader.defines.WIDTH = WIDTH.toFixed(1);
  readWaterLevelShader.defines.BOUNDS = BOUNDS.toFixed(1);

  // Create a 4x1 pixel image and a render target (Uint8, 4 channels, 1 byte per channel) to read water height and orientation
  readWaterLevelImage = new Uint8Array(4 * 1 * 4);

  readWaterLevelRenderTarget = new THREE.WebGLRenderTarget(4, 1, {
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: false,
  });
}

function fillTexture(texture: THREE.DataTexture) {
  const waterMaxHeight = 0.1;

  function noise(x: number, y: number) {
    let multR = waterMaxHeight;
    let mult = 0.025;
    let r = 0;
    for (let i = 0; i < 15; i++) {
      r += multR * simplex.noise(x * mult, y * mult);
      multR *= 0.53 + 0.025 * i;
      mult *= 1.25;
    }

    return r;
  }

  const pixels = texture.image.data as Float32Array;

  let p = 0;
  for (let j = 0; j < WIDTH; j++) {
    for (let i = 0; i < WIDTH; i++) {
      const x = (i * 128) / WIDTH;
      const y = (j * 128) / WIDTH;

      pixels[p + 0] = noise(x, y);
      pixels[p + 1] = pixels[p + 0];
      pixels[p + 2] = 0;
      pixels[p + 3] = 1;

      p += 4;
    }
  }
}

function addShadow(v: boolean) {
  renderer.shadowMap.enabled = v;
  sun.castShadow = v;

  if (v) {
    renderer.shadowMap.type = THREE.VSMShadowMap;
    const shadow = sun.shadow;
    shadow.mapSize.width = shadow.mapSize.height = 2048;
    shadow.radius = 2;
    shadow.bias = -0.0005;
    const shadowCam = shadow.camera,
      s = 5;
    shadowCam.near = 0.1;
    shadowCam.far = 6;
    shadowCam.right = shadowCam.top = s;
    shadowCam.left = shadowCam.bottom = -s;
  } else {
    if (sun.shadow) sun.shadow.dispose();
  }

  // debug shadow
  //scene.add(  new THREE.CameraHelper(shadowCam) );
}

function smoothWater() {
  const currentRenderTarget =
    gpuCompute.getCurrentRenderTarget(heightmapVariable);
  const alternateRenderTarget =
    gpuCompute.getAlternateRenderTarget(heightmapVariable);

  for (let i = 0; i < 10; i++) {
    smoothShader.uniforms["smoothTexture"].value = currentRenderTarget.texture;
    gpuCompute.doRenderTarget(smoothShader, alternateRenderTarget);

    smoothShader.uniforms["smoothTexture"].value =
      alternateRenderTarget.texture;
    gpuCompute.doRenderTarget(smoothShader, currentRenderTarget);
  }
}

function createducks() {
  for (let i = 0; i < NUM_DUCK; i++) {
    let sphere = duckModel!;
    if (i < NUM_DUCK - 1) {
      sphere = duckModel!.clone();
    }

    sphere.position.x = (Math.random() - 0.5) * BOUNDS * 0.7;
    sphere.position.z = (Math.random() - 0.5) * BOUNDS * 0.7;

    sphere.userData.velocity = new THREE.Vector3();

    scene.add(sphere);

    ducks[i] = sphere;
  }
}

function duckDynamics() {
  readWaterLevelShader.uniforms["levelTexture"].value = tmpHeightmap;

  for (let i = 0; i < NUM_DUCK; i++) {
    const sphere = ducks[i];

    if (sphere) {
      // Read water level and orientation
      const u = (0.5 * sphere.position.x) / BOUNDS_HALF + 0.5;
      const v = 1 - ((0.5 * sphere.position.z) / BOUNDS_HALF + 0.5);
      readWaterLevelShader.uniforms["point1"].value.set(u, v);
      gpuCompute.doRenderTarget(
        readWaterLevelShader,
        readWaterLevelRenderTarget
      );

      renderer.readRenderTargetPixels(
        readWaterLevelRenderTarget,
        0,
        0,
        4,
        1,
        readWaterLevelImage
      );
      const pixels = new Float32Array(readWaterLevelImage.buffer);

      // Get orientation
      waterNormal.set(pixels[1], 0, -pixels[2]);

      const pos = sphere.position;

      const startPos = pos.clone();

      // Set height
      pos.y = pixels[0];

      // Move sphere
      waterNormal.multiplyScalar(0.01);
      sphere.userData.velocity.add(waterNormal);
      sphere.userData.velocity.multiplyScalar(0.998);
      pos.add(sphere.userData.velocity);

      const decal = 0.001;
      const limit = BOUNDS_HALF - 0.2;

      if (pos.x < -limit) {
        pos.x = -limit + decal;
        sphere.userData.velocity.x *= -0.3;
      } else if (pos.x > limit) {
        pos.x = limit - decal;
        sphere.userData.velocity.x *= -0.3;
      }

      if (pos.z < -limit) {
        pos.z = -limit + decal;
        sphere.userData.velocity.z *= -0.3;
      } else if (pos.z > limit) {
        pos.z = limit - decal;
        sphere.userData.velocity.z *= -0.3;
      }

      // duck orientation test

      const startNormal = new THREE.Vector3(
        pixels[1],
        1,
        -pixels[2]
      ).normalize();

      const dir = startPos.sub(pos);
      dir.y = 0;
      dir.normalize();

      const yAxis = new THREE.Vector3(0, 1, 0);
      const zAxis = new THREE.Vector3(0, 0, -1);
      tmpQuatX.setFromUnitVectors(zAxis, dir);
      tmpQuatZ.setFromUnitVectors(yAxis, startNormal);
      tmpQuat.multiplyQuaternions(tmpQuatZ, tmpQuatX);
      sphere.quaternion.slerp(tmpQuat, 0.017);
    }
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onPointerDown() {
  mousedown = true;
}

function onPointerUp() {
  mousedown = false;
  controls.enabled = true;
}

function onPointerMove(event: PointerEvent) {
  const dom = renderer.domElement;
  mouseCoords.set(
    (event.clientX / dom.clientWidth) * 2 - 1,
    -(event.clientY / dom.clientHeight) * 2 + 1
  );
}

function raycast() {
  // Set uniforms: mouse interaction
  const uniforms = heightmapVariable.material.uniforms;
  if (mousedown) {
    raycaster.setFromCamera(mouseCoords, camera);

    const intersects = raycaster.intersectObject(meshRay);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      uniforms["mousePos"].value.set(point.x, point.z);
      if (controls.enabled) controls.enabled = false;
    } else {
      uniforms["mousePos"].value.set(10000, 10000);
    }
  } else {
    uniforms["mousePos"].value.set(10000, 10000);
  }
}

function animate() {
  render();
  stats.update();
}

function render() {
  raycast();

  frame++;

  if (frame >= 7 - effectController.speed) {
    // Do the gpu computation
    gpuCompute.compute();
    tmpHeightmap = gpuCompute.getCurrentRenderTarget(heightmapVariable).texture;

    if (ducksEnabled) duckDynamics();

    // Get compute output in custom uniform
    // 实际为赋值到 material 的 uniforms 中
    // @ts-ignore
    if (waterMesh) waterMesh.material.heightmap = tmpHeightmap;

    frame = 0;
  }

  // Render
  renderer.render(scene, camera);
}

//----------------------

class WaterMaterial extends THREE.MeshStandardMaterial {
  extra: { [key: string]: unknown };
  constructor(parameters: THREE.MeshStandardMaterialParameters) {
    super();

    this.defines = {
      STANDARD: "",
      USE_UV: "",
      WIDTH: WIDTH.toFixed(1),
      BOUNDS: BOUNDS.toFixed(1),
    };

    this.extra = {};

    this.addParameter("heightmap", null);

    this.setValues(parameters);
  }

  addParameter(name: string, value: unknown) {
    this.extra[name] = value;
    Object.defineProperty(this, name, {
      get: () => this.extra[name],
      set: (v) => {
        this.extra[name] = v;
        if (this.userData.shader)
          this.userData.shader.uniforms[name].value = this.extra[name];
      },
    });
  }

  onBeforeCompile(shader: THREE.WebGLProgramParametersWithUniforms) {
    for (const name in this.extra) {
      shader.uniforms[name] = { value: this.extra[name] };
    }

    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      shaderChange.common
    );
    //shader.vertexShader = 'uniform sampler2D heightmap;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <beginnormal_vertex>",
      shaderChange.beginnormal_vertex
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      shaderChange.begin_vertex
    );

    this.userData.shader = shader;
  }
}

const shaderChange = {
  heightmap_frag: /* glsl */ `
				#include <common>

				uniform vec2 mousePos;
				uniform float mouseSize;
				uniform float viscosity;
				uniform float deep;

				void main()	{

					vec2 cellSize = 1.0 / resolution.xy;

					vec2 uv = gl_FragCoord.xy * cellSize;

					// heightmapValue.x == height from previous frame
					// heightmapValue.y == height from penultimate frame
					// heightmapValue.z, heightmapValue.w not used
					vec4 heightmapValue = texture2D( heightmap, uv );

					// Get neighbours
					vec4 north = texture2D( heightmap, uv + vec2( 0.0, cellSize.y ) );
					vec4 south = texture2D( heightmap, uv + vec2( 0.0, - cellSize.y ) );
					vec4 east = texture2D( heightmap, uv + vec2( cellSize.x, 0.0 ) );
					vec4 west = texture2D( heightmap, uv + vec2( - cellSize.x, 0.0 ) );

					//float newHeight = ( ( north.x + south.x + east.x + west.x ) * 0.5 - heightmapValue.y ) * viscosity;
					float newHeight = ( ( north.x + south.x + east.x + west.x ) * 0.5 - (heightmapValue.y) ) * viscosity;


					// Mouse influence
					float mousePhase = clamp( length( ( uv - vec2( 0.5 ) ) * BOUNDS - vec2( mousePos.x, - mousePos.y ) ) * PI / mouseSize, 0.0, PI );
					//newHeight += ( cos( mousePhase ) + 1.0 ) * 0.28 * 10.0;
					newHeight -= ( cos( mousePhase ) + 1.0 ) * deep;

					heightmapValue.y = heightmapValue.x;
					heightmapValue.x = newHeight;

					gl_FragColor = heightmapValue;

				}
				`,
  // FOR MATERIAL
  common: /* glsl */ `
				#include <common>
				uniform sampler2D heightmap;
				`,
  beginnormal_vertex: /* glsl */ `
				vec2 cellSize = vec2( 1.0 / WIDTH, 1.0 / WIDTH );
				vec3 objectNormal = vec3(
				( texture2D( heightmap, uv + vec2( - cellSize.x, 0 ) ).x - texture2D( heightmap, uv + vec2( cellSize.x, 0 ) ).x ) * WIDTH / BOUNDS,
				( texture2D( heightmap, uv + vec2( 0, - cellSize.y ) ).x - texture2D( heightmap, uv + vec2( 0, cellSize.y ) ).x ) * WIDTH / BOUNDS,
				1.0 );
				#ifdef USE_TANGENT
					vec3 objectTangent = vec3( tangent.xyz );
				#endif
				`,
  begin_vertex: /* glsl */ `
				float heightValue = texture2D( heightmap, uv ).x;
				vec3 transformed = vec3( position.x, position.y, heightValue );
				#ifdef USE_ALPHAHASH
					vPosition = vec3( position );
				#endif
				`,
};
