import {positionLocal, sin, time, vec4} from "three/tsl";
import {MeshBasicNodeMaterial} from "three/webgpu";

export function getMaterial() {
  // 最小 TSL 节点材质；随时间变色
  const R = sin(positionLocal.x.add(time)).add(1).mul(0.5);
  const G = sin(positionLocal.y.add(time)).add(1).mul(0.5);
  const B = sin(positionLocal.x.add(time)).add(1).mul(0.5);
  const A = sin(time).add(1).mul(0.5);
  const material = new MeshBasicNodeMaterial({
    colorNode: vec4(R, G, B, A),
    transparent: true,
  });
  return material;
}
