import * as THREE from "three";
import { Component, GameObject } from "./GameObject";
import { globals } from "./globals";

globals.gui.add(globals, "debug").onChange(showHideDebugInfo);

const labelContainerElem = document.querySelector("#labels") as HTMLDivElement;
function showHideDebugInfo() {
  labelContainerElem.style.display = globals.debug ? "" : "none";
}

showHideDebugInfo();
export class StateDisplayHelper extends Component {
  elem: HTMLDivElement;
  pos: THREE.Vector3;
  helper: THREE.PolarGridHelper;
  constructor(gameObject: GameObject, size: number) {
    super(gameObject);
    this.elem = document.createElement("div");
    labelContainerElem.appendChild(this.elem);
    this.pos = new THREE.Vector3(0, 0, 0);
    // 放在地面上的环形标识
    this.helper = new THREE.PolarGridHelper(size / 2, 1, 1, 16);
    // @ts-ignore
    gameObject.transform.add(this.helper);
  }

  setState(s: string) {
    this.elem.textContent = s;
  }

  setColor(cssColor: string) {
    this.elem.style.color = cssColor;
    // @ts-ignore
    this.helper.material.color.set(cssColor);
  }

  update() {
    this.helper.visible = globals.debug;
    if (!globals.debug) {
      return;
    }
    const { pos } = this;
    const { transform } = this.gameObject;
    const { canvas } = globals;
    pos.copy(transform.position);

    // get the normalized screen coordinate of that position
    // x and y will be in the -1 to +1 range with x = -1 being
    // on the left and y = -1 being on the bottom of the screen
    pos.project(globals.camera!);

    // convert the normalized position to CSS coordinates
    const x = (pos.x * 0.5 + 0.5) * canvas?.clientWidth!;
    const y = (pos.y * -0.5 + 0.5) * canvas?.clientHeight!;

    // move the elem to that position
    this.elem.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
  }
}
