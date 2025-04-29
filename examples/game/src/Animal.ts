import { Component, GameObject } from "./GameObject";
import { globals } from "./globals";
import { SkinInstance } from "./SkinInstance";
import type { Model } from "./types/Model";

export class Animal extends Component {
  constructor(gameObject: GameObject, model: Model) {
    super(gameObject);

    const skinInstance = gameObject.addComponent(SkinInstance, model);
    skinInstance.mixer.timeScale = globals.moveSpeed / 4;
    skinInstance.setAnimation("Idle");
  }

  update() {
    // Update logic for the animal
  }
}
