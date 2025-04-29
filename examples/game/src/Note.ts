import * as THREE from "three";
import { Component, GameObject } from "./GameObject";
import { rand } from "./utils";
import { CoroutineRunner } from "./CoroutineRunner";
import { gameObjectManager, globals } from "./globals";

function makeTextTexture(str: string) {
  const ctx = document.createElement("canvas").getContext("2d")!;
  ctx.canvas.width = 64;
  ctx.canvas.height = 64;
  ctx.font = "60px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#FFF";
  ctx.fillText(str, ctx.canvas.width / 2, ctx.canvas.height / 2);
  return new THREE.CanvasTexture(ctx.canvas);
}
const noteTexture = makeTextTexture("♪");

export class Note extends Component {
  runner: CoroutineRunner;
  constructor(gameObject: GameObject) {
    super(gameObject);
    const { transform } = gameObject;
    const noteMaterial = new THREE.SpriteMaterial({
      color: new THREE.Color().setHSL(rand(1), 1, 0.5),
      map: noteTexture,
      side: THREE.DoubleSide,
      transparent: true,
    });
    const note = new THREE.Sprite(noteMaterial);
    note.scale.setScalar(3);
    transform.add(note);
    this.runner = new CoroutineRunner();
    const direction = new THREE.Vector3(rand(-0.2, 0.2), 1, rand(-0.2, 0.2));

    function* moveAndRemove() {
      for (let i = 0; i < 60; ++i) {
        transform.translateOnAxis(direction, globals.deltaTime * 10);
        noteMaterial.opacity = 1 - i / 60;
        yield;
      }
      transform.parent!.remove(transform);
      gameObjectManager.removeGameObject(gameObject);
    }

    this.runner.add(moveAndRemove());
  }

  update() {
    this.runner.update();
  }
}
