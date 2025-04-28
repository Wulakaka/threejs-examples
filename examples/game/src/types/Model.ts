import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/Addons.js";
export interface Model {
  url: string;
  gltf?: GLTF;
  animations?: {
    [key: string]: THREE.AnimationClip;
  };
}
