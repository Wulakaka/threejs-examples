uniform float time;
uniform float testing;
uniform float delta; // about 0.016
uniform float separationDistance; // 20
uniform float alignmentDistance; // 40
uniform float cohesionDistance; //
uniform float freedomFactor;
// 捕食者位置
// uniform vec3 predator;
uniform vec3 rayOrigin;
uniform vec3 rayDirection;

const float width = resolution.x;
const float height = resolution.y;

const float PI = 3.141592653589793;
const float PI_2 = PI * 2.0;
    // const float VISION = PI * 0.55;

float zoneRadius = 40.0;
float zoneRadiusSquared = 1600.0;

float separationThresh = 0.45;
float alignmentThresh = 0.65;

// const float UPPER_BOUNDS = BOUNDS;
// const float LOWER_BOUNDS = -UPPER_BOUNDS;

const float SPEED_LIMIT = 9.0;

float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  // 区域半径
  zoneRadius = separationDistance + alignmentDistance + cohesionDistance;
  // 分离阈值，是个小数
  separationThresh = separationDistance / zoneRadius;
  // 对齐阈值，小数
  alignmentThresh = (separationDistance + alignmentDistance) / zoneRadius;
  // 半径平方
  zoneRadiusSquared = zoneRadius * zoneRadius;

  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec3 birdPosition, birdVelocity;

  vec3 selfPosition = texture2D(texturePosition, uv).xyz;
  vec3 selfVelocity = texture2D(textureVelocity, uv).xyz;

  float dist;
  vec3 dir; // direction
  float distSquared;

  float separationSquared = separationDistance * separationDistance;
  float cohesionSquared = cohesionDistance * cohesionDistance;

  float f;
  float percent;

  vec3 velocity = selfVelocity;

  float limit = SPEED_LIMIT;
  // 捕食者方向
  // predator 的 x,y 是 (-0.5, 0.5) 的范围
  // 乘以 UPPER_BOUNDS 是为了近成鼠标位置
  // dir = predator * UPPER_BOUNDS - selfPosition;
  // dir.z = 0.;
      // dir.z *= 0.6;
  // 投影到xy平面上的距离，也就是鼠标到鸟的距离
  // dist = length(dir);

  vec3 directionToRay = rayOrigin - selfPosition;
  float projectionLength = dot(directionToRay, rayDirection);
  vec3 closestPoint = rayOrigin - rayDirection * projectionLength;
  vec3 directionToClosestPoint = closestPoint - selfPosition;
  float distToClosestPoint = length(directionToClosestPoint);
  dir = directionToClosestPoint;
  dist = distToClosestPoint;

  distSquared = dist * dist;

  // 控制多大范围内会受到捕食者的影响
  float preyRadius = 150.0;
  float preyRadiusSq = preyRadius * preyRadius;

      // move birds away from predator
  if(dist < preyRadius) {
    // f 是一个负值，使用平方数是为了让距离越远，衰减越快，而不是线性衰减
    f = (distSquared / preyRadiusSq - 1.0) * delta * 100.;
    // 在当前速度的基础上，增加一个向外的速度
    velocity += normalize(dir) * f;
    // 为啥要加 5.0？
    // 如果有追赶者，需要明显加速
    limit += 5.0;
  }

      // if (testing == 0.0) {}
      // if ( rand( uv + time ) < freedomFactor ) {}

      // Attract flocks to the center
      // 吸引鸟群到中心
  vec3 central = vec3(0., 0., 0.);
  // vec3 central = vec3((resolution.x - 0.5) * BOUNDS, (resolution.y - 0.5) * BOUNDS, 0.);
  // 远离中心的方向
  dir = selfPosition - central;
  // 距离中心的距离
  dist = length(dir);

  // 为什么在 y 方向上扩大？为了使鸟群呈现椭圆，而不是圆形
  dir.y *= 2.5;
  // 增加回到中心的速度
  velocity -= normalize(dir) * delta * 5.;

  // 遍历跟每只鸟的距离
  for(float y = 0.0; y < height; y++) {
    for(float x = 0.0; x < width; x++) {

      vec2 ref = vec2(x + 0.5, y + 0.5) / resolution.xy;
      birdPosition = texture2D(texturePosition, ref).xyz;

      dir = birdPosition - selfPosition;
      dist = length(dir);

      if(dist < 0.0001)
        continue;

      distSquared = dist * dist;

      // 如果距离太远，不影响当前鸟
      if(distSquared > zoneRadiusSquared)
        continue;

      percent = distSquared / zoneRadiusSquared;

      // 距离太近就分离，适中就对齐，远了就聚合
      // 如果距离小于分离距离，则加速
      if(percent < separationThresh) { // low

            // Separation - Move apart for comfort
        f = (separationThresh / percent - 1.0) * delta;
        velocity -= normalize(dir) * f;

      // 如果距离在分离距离和对齐距离之间
      } else if(percent < alignmentThresh) { // high

            // Alignment - fly the same direction
        float threshDelta = alignmentThresh - separationThresh;
        // 与对齐距离越远，adjustedPercent 越大。 [0, 1]
        float adjustedPercent = (percent - separationThresh) / threshDelta;
        // 当前速度
        birdVelocity = texture2D(textureVelocity, ref).xyz;

        // 使用 cosine 函数来让 f 并不是线性增加
        // adjustedPercent 为 0.5 时，f 达到最大，为 1.5
        f = (0.5 - cos(adjustedPercent * PI_2) * 0.5 + 0.5) * delta;
        velocity += normalize(birdVelocity) * f;

      } else {

            // Attraction / Cohesion - move closer
        float threshDelta = 1.0 - alignmentThresh;
        float adjustedPercent;
        // 聚合距离为 0
        if(threshDelta == 0.)
          adjustedPercent = 1.;
        else
          adjustedPercent = (percent - alignmentThresh) / threshDelta;

        f = (0.5 - (cos(adjustedPercent * PI_2) * -0.5 + 0.5)) * delta;

        velocity += normalize(dir) * f;

      }

    }

  }

      // this make tends to fly around than down or up
      // if (velocity.y > 0.) velocity.y *= (1. - 0.2 * delta);

      // Speed Limits
  if(length(velocity) > limit) {
    velocity = normalize(velocity) * limit;
  }

  gl_FragColor = vec4(velocity, 1.0);

}
