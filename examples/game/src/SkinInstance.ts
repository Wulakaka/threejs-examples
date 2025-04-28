import * as THREE from "three";
import { SkeletonUtils } from "three/examples/jsm/Addons.js";
import { Component } from "./GameObject";
import { globals } from "./globals";
import type { GameObject } from "./GameObject";
import { Model } from "./types/Model";

export class SkinInstance extends Component {
  model: Model;
  animRoot: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  actions: { [key: string]: THREE.AnimationAction };
  constructor(gameObject: GameObject, model: Model) {
    super(gameObject);
    this.model = model;
    this.animRoot = SkeletonUtils.clone(this.model.gltf!.scene);
    this.mixer = new THREE.AnimationMixer(this.animRoot);
    gameObject.transform.add(this.animRoot);
    this.actions = {};
  }

  setAnimation(animName: string) {
    const clip = this.model.animations![animName];
    // turn off all current actions
    for (const action of Object.values(this.actions)) {
      action.enabled = false;
    }
    // get or create existing action for clip
    const action = this.mixer.clipAction(clip);
    action.enabled = true;
    action.reset();
    action.play();
    this.actions[animName] = action;
  }

  update() {
    this.mixer.update(globals.deltaTime);
  }
}
