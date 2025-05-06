import * as THREE from "three";
// Custom Geometry - using 3 triangles each. No UVs, no normals currently.
export class BirdGeometry extends THREE.BufferGeometry {
  constructor(width: number, height: number) {
    super();

    // 每个鸟有3个三角形
    const trianglesPerBird = 3;
    // 所有鸟的三角形数量
    const triangles = width * height * trianglesPerBird;
    // 每个三角形有3个顶点
    // 所有三角形的顶点数量
    const points = triangles * 3;

    // 位置属性
    const vertices = new THREE.BufferAttribute(new Float32Array(points * 3), 3);

    // 参考属性
    // 每一个顶点可以通过 reference 属性来获得自己在 texture 中的坐标
    const references = new THREE.BufferAttribute(
      new Float32Array(points * 2),
      2
    );

    // 顶点索引，可以用来标记翅膀的顶点，做翅膀煽动用
    const birdVertex = new THREE.BufferAttribute(new Float32Array(points), 1);

    this.setAttribute("position", vertices);
    this.setAttribute("reference", references);
    this.setAttribute("birdVertex", birdVertex);

    // this.setAttribute( 'normal', new Float32Array( points * 3 ), 3 );

    let v = 0;

    // 填充顶点数据
    function verts_push(...list: number[]) {
      for (let i = 0; i < list.length; i++) {
        vertices.array[v++] = list[i];
      }
    }

    const wingsSpan = 20;
    // 构建鸟的几何体
    for (let f = 0; f < width * height; f++) {
      // Body

      verts_push(0, -0, -20, 0, 4, -20, 0, 0, 30);

      // Wings

      verts_push(0, 0, -15, -wingsSpan, 0, 0, 0, 0, 15);

      verts_push(0, 0, 15, wingsSpan, 0, 0, 0, 0, -15);
    }

    for (let v = 0; v < triangles * 3; v++) {
      // ~~ 取整
      // 三角形的索引
      const triangleIndex = ~~(v / 3);
      // 鸟的索引
      const birdIndex = ~~(triangleIndex / trianglesPerBird);
      // 横向占比
      const x = (birdIndex % width) / width;
      // 纵向占比
      const y = ~~(birdIndex / width) / height;

      // 画布的位置信息表示对应的鸟，相当于 UV
      references.array[v * 2] = x;
      references.array[v * 2 + 1] = y;

      // [0,1,2,3,4,5,6,7,8,0,1,2,3,4,5,6,7,8,...] 索引为4或7就是翅膀的顶点
      birdVertex.array[v] = v % 9;
    }

    this.scale(0.4, 0.4, 0.4);
  }
}
