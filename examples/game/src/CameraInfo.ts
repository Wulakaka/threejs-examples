import * as THREE from "three";
import { Component, GameObject } from "./GameObject";
import { globals } from "./globals";

export class CameraInfo extends Component {
  projScreenMatrix: THREE.Matrix4;
  frustum: THREE.Frustum;
  constructor(gameObject: GameObject) {
    super(gameObject);
    this.projScreenMatrix = new THREE.Matrix4();
    this.frustum = new THREE.Frustum();
  }

  update() {
    const { camera } = globals;
    this.projScreenMatrix.multiplyMatrices(
      camera!.projectionMatrix,
      camera!.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
  }
}
