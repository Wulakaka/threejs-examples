import * as THREE from "three";
import { InputManager } from "./InputManager";
import type { CameraInfo } from "./CameraInfo";
import type { GameObject } from "./GameObject";

export const globals: {
  time: number;
  deltaTime: number;
  moveSpeed: number;
  cameraInfo?: CameraInfo;
  camera?: THREE.PerspectiveCamera;
  canvas?: HTMLCanvasElement;
  congaLine?: GameObject[];
} = {
  time: 0,
  deltaTime: 0,
  moveSpeed: 16,
};

export const inputManager = new InputManager();

export const kForward = new THREE.Vector3(0, 0, 1);
