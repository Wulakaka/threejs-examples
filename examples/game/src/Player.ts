import { CoroutineRunner, waitSeconds } from "./CoroutineRunner";
import { Component, GameObject } from "./GameObject";
import {
  globals,
  inputManager,
  kForward,
  gameObjectManager,
  scene,
} from "./globals";
import { Note } from "./Note";
import { SkinInstance } from "./SkinInstance";
import { Model } from "./types/Model";
import { rand } from "./utils";

export class Player extends Component {
  skinInstance: SkinInstance;
  turnSpeed: number;
  offscreenTime: number;
  maxTimeOffScreen: number;
  runner: CoroutineRunner;
  constructor(gameObject: GameObject, models: { [modelName: string]: Model }) {
    super(gameObject);
    const model = models.knight;
    globals.playerRadius = model.size! / 2;
    this.skinInstance = gameObject.addComponent(SkinInstance, model);
    this.skinInstance.setAnimation("Run");
    this.turnSpeed = globals.moveSpeed / 4;
    this.offscreenTime = 0;
    this.maxTimeOffScreen = 3;

    this.runner = new CoroutineRunner();

    function* emitNotes() {
      for (;;) {
        yield waitSeconds(rand(0.5, 1));
        const noteGO = gameObjectManager.createGameObject(scene, "note");
        noteGO.transform.position.copy(gameObject.transform.position);
        noteGO.transform.position.y += 5;
        noteGO.addComponent(Note);
      }
    }

    this.runner.add(emitNotes());
  }

  update() {
    this.runner.update();
    const { deltaTime, moveSpeed, cameraInfo } = globals;
    const { transform } = this.gameObject;
    const delta =
      (inputManager.keys.left.down ? 1 : 0) +
      (inputManager.keys.right.down ? -1 : 0);
    transform.rotation.y += this.turnSpeed * delta * deltaTime;
    // 自动朝前方移动；基于本地坐标系
    transform.translateOnAxis(kForward, moveSpeed * deltaTime);

    // 如果 player 超出视锥体，则将其位置重置为 (0, 0, 0)
    const { frustum } = cameraInfo!;
    if (frustum.containsPoint(transform.position)) {
      this.offscreenTime = 0;
    } else {
      this.offscreenTime += deltaTime;
      if (this.offscreenTime > this.maxTimeOffScreen) {
        transform.position.set(0, 0, 0);
      }
    }
  }
}
