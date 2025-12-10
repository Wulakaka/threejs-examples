import {
  dot,
  fract,
  max,
  min,
  mul,
  sin,
  uv,
  vec2,
  vec3,
  vec4,
  Fn,
  distance,
  length,
  float,
  positionLocal,
  time,
  positionWorld,
} from "three/tsl";
import {MeshBasicNodeMaterial} from "three/webgpu";

export function getMaterial() {
  const strength = mul(
    float(0.15).div(
      vec2(uv().x, uv().y.sub(0.5).mul(5).add(0.5)).distance(vec2(0.5))
    ),
    float(0.15).div(
      vec2(uv().y, uv().x.sub(0.5).mul(5).add(0.5)).distance(vec2(0.5))
    )
  );

  const positionNode = Fn(() => {
    const z = positionLocal.z.add(
      sin(time.mul(2).add(positionLocal.x)).mul(0.25)
    );
    return vec3(positionLocal.x, positionLocal.y, z);
  });

  const material = new MeshBasicNodeMaterial({
    // 大多数情况使用 colorNode 即可，而不必使用 fragmentNode
    colorNode: strength,
    positionNode: positionNode(),
    // vertexNode: vec4(positionWorld, 1),
  });
  return material;
}
