import {
  mul,
  sin,
  vec3,
  vec4,
  Fn,
  positionLocal,
  time,
  ShaderNodeObject,
  mix,
  add,
} from "three/tsl";
import {Color, MeshBasicNodeMaterial, UniformNode, Vector2} from "three/webgpu";

export function getMaterial({
  uBigWavesElevation,
  uBigWavesFrequency,
  uBigWavesSpeed,
  uDepthColor,
  uSurfaceColor,
  uColorOffset,
  uColorMultiplier,
}: {
  uBigWavesElevation: ShaderNodeObject<UniformNode<Number>>;
  uBigWavesFrequency: ShaderNodeObject<UniformNode<Vector2>>;
  uBigWavesSpeed: ShaderNodeObject<UniformNode<Number>>;
  uDepthColor: ShaderNodeObject<UniformNode<Color>>;
  uSurfaceColor: ShaderNodeObject<UniformNode<Color>>;
  uColorOffset: ShaderNodeObject<UniformNode<Number>>;
  uColorMultiplier: ShaderNodeObject<UniformNode<Number>>;
}) {
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

  const mixStrength = add(elevation, uColorOffset).mul(uColorMultiplier);

  const color = mix(uDepthColor, uSurfaceColor, mixStrength);

  const material = new MeshBasicNodeMaterial({
    // 大多数情况使用 colorNode 即可，而不必使用 fragmentNode
    colorNode: vec4(color, 1.0),
    positionNode: vec3(positionLocal.x, positionLocal.y, z),
  });
  return material;
}
