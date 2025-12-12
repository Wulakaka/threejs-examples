import {
  mul,
  sin,
  vec3,
  vec4,
  Fn,
  positionLocal,
  time,
  ShaderNodeObject,
} from "three/tsl";
import {MeshBasicNodeMaterial, UniformNode, Vector2} from "three/webgpu";

export function getMaterial({
  uBigWavesElevation,
  uBigWavesFrequency,
  uBigWavesSpeed,
}: {
  uBigWavesElevation: ShaderNodeObject<UniformNode<Number>>;
  uBigWavesFrequency: ShaderNodeObject<UniformNode<Vector2>>;
  uBigWavesSpeed: ShaderNodeObject<UniformNode<Number>>;
}) {
  const positionNode = Fn(() => {
    // Elevation 中文意思是“海拔，高度”
    const elevation = mul(
      sin(
        positionLocal.x.mul(uBigWavesFrequency.x).add(time.mul(uBigWavesSpeed))
      ),
      sin(
        positionLocal.y.mul(uBigWavesFrequency.y).add(time.mul(uBigWavesSpeed))
      ),
      uBigWavesElevation
    );

    const z = positionLocal.z.add(elevation);

    return vec3(positionLocal.x, positionLocal.y, z);
  });

  const material = new MeshBasicNodeMaterial({
    // 大多数情况使用 colorNode 即可，而不必使用 fragmentNode
    colorNode: vec4(0.5, 0.8, 1.0, 1.0),
    positionNode: positionNode(),
  });
  return material;
}
