import * as THREE from "three";
import { InputManager } from "./InputManager";
import type { CameraInfo } from "./CameraInfo";
import type { GameObject } from "./GameObject";
import { Player } from "./Player";

export const globals: {
  time: number;
  deltaTime: number;
  moveSpeed: number;
  cameraInfo?: CameraInfo;
  camera?: THREE.PerspectiveCamera;
  canvas?: HTMLCanvasElement;
  congaLine: GameObject[];
  player?: Player;
  playerRadius?: number;
} = {
  time: 0,
  deltaTime: 0,
  moveSpeed: 16,
  congaLine: [],
};

export const inputManager = new InputManager();

export const kForward = new THREE.Vector3(0, 0, 1);
