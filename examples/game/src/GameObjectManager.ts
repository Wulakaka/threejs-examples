import * as THREE from "three";
import { GameObject } from "./GameObject";
import { SafeArray } from "./SafeArray";

export class GameObjectManager {
  gameObjects: SafeArray<GameObject>;
  constructor() {
    this.gameObjects = new SafeArray();
  }

  createGameObject(parent: THREE.Object3D, name: string) {
    const gameObject = new GameObject(parent, name);
    this.gameObjects.add(gameObject);
    return gameObject;
  }

  removeGameObject(gameObject: GameObject) {
    this.gameObjects.remove(gameObject);
  }

  update() {
    this.gameObjects.forEach((gameObject) => gameObject.update());
  }
}
