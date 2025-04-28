import { InputManager } from "./InputManager";
import * as THREE from "three";

export const globals = {
  time: 0,
  deltaTime: 0,
  moveSpeed: 16,
};

export const inputManager = new InputManager();

export const kForward = new THREE.Vector3(0, 0, 1);
