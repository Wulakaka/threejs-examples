import * as THREE from "three";
export class ButterflyGeometry extends THREE.BufferGeometry {
  constructor() {
    super();
    const points = 12;
    const vertices = new THREE.BufferAttribute(new Float32Array(points * 3), 3);
    this.setAttribute("position", vertices);

    let v = 0;

    // 填充顶点数据
    function verts_push(...list: number[]) {
      for (let i = 0; i < list.length; i++) {
        vertices.array[v++] = list[i];
      }
    }

    // 左侧
    verts_push(0, 0, 0);
    verts_push(-1, 1, 0);
    verts_push(-0.8, 0, 0);

    verts_push(0, 0, 0);
    verts_push(-0.6, -0.3, 0);
    verts_push(-0.3, -0.8, 0);
    // 右侧
    verts_push(0, 0, 0);
    verts_push(1, 1, 0);
    verts_push(0.8, 0, 0);

    verts_push(0, 0, 0);
    verts_push(0.6, -0.3, 0);
    verts_push(0.3, -0.8, 0);

    const side = new THREE.BufferAttribute(new Float32Array(points), 1);
    for (let v = 0; v < points; v++) {
      side.array[v] = v < points / 2 ? -1 : 1;
    }
    this.setAttribute("aSide", side);

    this.scale(0.5, 0.5, 0.5);
  }
}
