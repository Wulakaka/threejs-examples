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
  Fn,
  distance,
  length,
  float,
} from "three/tsl";
import {MeshBasicNodeMaterial} from "three/webgpu";

export function getMaterial() {
  // -----------------------------------------------
  // const strength = uv().y.oneMinus();
  // -----------------------------------------------
  // const strength = uv().y.mul(10).mod(1);
  // -----------------------------------------------
  // const strength = uv()
  //   .x.mul(10)
  //   .mod(1)
  //   .step(0.8)
  //   .add(uv().y.mul(10).mod(1).step(0.8));
  // -----------------------------------------------
  // const strengthH = uv()
  //   .x.mul(10)
  //   .sub(0.2)
  //   .mod(1)
  //   .step(0.4)
  //   .mul(uv().y.mul(10).mod(1).step(0.8));

  // const strengthV = uv()
  //   .x.mul(10)
  //   .mod(1)
  //   .step(0.8)
  //   .mul(uv().y.mul(10).sub(0.2).mod(1).step(0.4));

  // const strength = strengthH.add(strengthV);
  // -----------------------------------------------

  // const strength = min(uv().x.sub(0.5).abs(), uv().y.sub(0.5).abs());
  // -----------------------------------------------
  // const strength = mul(
  //   max(uv().x.sub(0.5).abs(), uv().y.sub(0.5).abs()).step(0.2),
  //   max(uv().x.sub(0.5).abs(), uv().y.sub(0.5).abs()).step(0.25).oneMinus()
  // );
  // -----------------------------------------------
  // const strength = mul(
  //   uv().x.mul(10).floor().div(10),
  //   uv().y.mul(10).floor().div(10)
  // );
  // -----------------------------------------------

  // const random = Fn(([uv]: [ReturnType<typeof vec2>]) => {
  //   return fract(sin(dot(uv, vec2(12.9898, 78.233))).mul(43758.5453));
  // });

  // const gridUv = vec2(
  //   uv().x.mul(10).floor().div(10),
  //   uv().y.add(uv().x.mul(0.5)).mul(10).floor().div(10)
  // );

  // const strength = random(gridUv);

  // -----------------------------------------------

  // const strength = uv().length();
  // -----------------------------------------------
  // const strength = float(0.015).div(uv().distance(vec2(0.5, 0.5)));
  // -----------------------------------------------
  const strength = mul(
    float(0.15).div(
      vec2(uv().x, uv().y.sub(0.5).mul(5).add(0.5)).distance(vec2(0.5))
    ),
    float(0.15).div(
      vec2(uv().y, uv().x.sub(0.5).mul(5).add(0.5)).distance(vec2(0.5))
    )
  );
  // -----------------------------------------------

  const material = new MeshBasicNodeMaterial({
    colorNode: strength,
  });
  return material;
}
