import { Component, GameObject } from "./GameObject";
import { SkinInstance } from "./SkinInstance";
import { Model } from "./types/Model";

export class Player extends Component {
  skinInstance: SkinInstance;
  constructor(gameObject: GameObject, models: { [modelName: string]: Model }) {
    super(gameObject);
    const model = models.knight;
    this.skinInstance = gameObject.addComponent(SkinInstance, model);
    this.skinInstance.setAnimation("Run");
  }

  update() {
    // Player-specific update logic goes here
  }
}
