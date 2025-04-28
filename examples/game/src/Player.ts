import { Component, GameObject } from "./GameObject";
import { globals, inputManager, kForward } from "./globals";
import { SkinInstance } from "./SkinInstance";
import { Model } from "./types/Model";

export class Player extends Component {
  skinInstance: SkinInstance;
  turnSpeed: number;
  constructor(gameObject: GameObject, models: { [modelName: string]: Model }) {
    super(gameObject);
    const model = models.knight;
    this.skinInstance = gameObject.addComponent(SkinInstance, model);
    this.skinInstance.setAnimation("Run");
    this.turnSpeed = globals.moveSpeed / 4;
  }

  update() {
    const { deltaTime, moveSpeed } = globals;
    const { transform } = this.gameObject;
    const delta =
      (inputManager.keys.left.down ? 1 : 0) +
      (inputManager.keys.right.down ? -1 : 0);
    transform.rotation.y += this.turnSpeed * delta * deltaTime;
    // 自动朝前方移动；基于本地坐标系
    transform.translateOnAxis(kForward, moveSpeed * deltaTime);
  }
}
