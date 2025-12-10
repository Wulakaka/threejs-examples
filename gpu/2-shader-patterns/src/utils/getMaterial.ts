import {uv, vec3} from "three/tsl";
import {MeshBasicNodeMaterial} from "three/webgpu";

export function getMaterial() {
  const _uv = uv();
  const material = new MeshBasicNodeMaterial({
    colorNode: vec3(_uv.x, _uv.y, 1),
  });
  return material;
}
