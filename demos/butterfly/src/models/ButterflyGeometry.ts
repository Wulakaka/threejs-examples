import * as THREE from "three";
export class ButterflyGeometry extends THREE.BufferGeometry {
  constructor(width: number, height: number) {
    super();
    const count = width * height;
    const points = 12;

    const vertices = new THREE.BufferAttribute(
      new Float32Array(count * points * 3),
      3
    );
    const side = new THREE.BufferAttribute(new Float32Array(count * points), 1);
    const reference = new THREE.BufferAttribute(
      new Float32Array(count * points * 2),
      2
    );

    this.setAttribute("position", vertices);
    this.setAttribute("aSide", side);
    this.setAttribute("aReference", reference);

    let v = 0;

    // 填充顶点数据
    function verts_push(...list: number[]) {
      for (let i = 0; i < list.length; i++) {
        vertices.array[v++] = list[i];
      }
    }

    for (let i = 0; i < count; i++) {
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
    }

    for (let v = 0; v < count * points; v++) {
      side.array[v] = v % points < points / 2 ? -1 : 1;

      // 第几个蝴蝶
      const i = ~~(v / points);
      const x = (i % width) / width;
      const y = ~~(i / width) / height;
      reference.array[v * 2] = x;
      reference.array[v * 2 + 1] = y;
    }

    this.scale(0.5, 0.5, 0.5);
  }
}
