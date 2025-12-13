import {
  mul,
  sin,
  vec3,
  vec4,
  positionLocal,
  time,
  ShaderNodeObject,
  mix,
  add,
  mx_fractal_noise_float,
  Loop,
  Fn,
  int,
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
  uSmallWavesElevation,
  uSmallWavesFrequency,
  uSmallWavesSpeed,
  uSmallIterations,
}: {
  uBigWavesElevation: ShaderNodeObject<UniformNode<Number>>;
  uBigWavesFrequency: ShaderNodeObject<UniformNode<Vector2>>;
  uBigWavesSpeed: ShaderNodeObject<UniformNode<Number>>;
  uDepthColor: ShaderNodeObject<UniformNode<Color>>;
  uSurfaceColor: ShaderNodeObject<UniformNode<Color>>;
  uColorOffset: ShaderNodeObject<UniformNode<Number>>;
  uColorMultiplier: ShaderNodeObject<UniformNode<Number>>;
  uSmallWavesElevation: ShaderNodeObject<UniformNode<Number>>;
  uSmallWavesFrequency: ShaderNodeObject<UniformNode<Number>>;
  uSmallWavesSpeed: ShaderNodeObject<UniformNode<Number>>;
  uSmallIterations: ShaderNodeObject<UniformNode<Number>>;
}) {
  const f = Fn(() => {
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

    Loop(uSmallIterations, ({i}) => {
      const noise = mx_fractal_noise_float(
        vec3(
          positionLocal.xy.mul(uSmallWavesFrequency).mul(int(i).add(1)),
          time.mul(uSmallWavesSpeed)
        )
      )
        .mul(uSmallWavesElevation)
        .div(int(i).add(1))
        .abs();

      elevation.subAssign(noise);
    });
    return elevation;
  });

  const elevation = f();

  const z = positionLocal.z.add(elevation);

  const mixStrength = add(elevation, uColorOffset).mul(uColorMultiplier);

  const color = mix(uDepthColor, uSurfaceColor, mixStrength);

  const material = new MeshBasicNodeMaterial({
    // 大多数情况使用 colorNode 即可，而不必使用 fragmentNode
    colorNode: vec4(color, 1),
    positionNode: vec3(positionLocal.x, positionLocal.y, z),
    // transparent: true,
  });
  return material;
}
