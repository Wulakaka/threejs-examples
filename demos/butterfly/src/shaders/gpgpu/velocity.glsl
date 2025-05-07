uniform vec3 uRayOrigin;
uniform vec3 uRayDirection;

const float SPEED_LIMIT = 0.1;

const float width = resolution.x;
const float height = resolution.y;

void main() {
  float limit = SPEED_LIMIT;
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec3 position = texture2D(texturePosition, uv).xyz;
  vec3 velocity = texture2D(textureVelocity, uv).xyz;
  vec3 oldVelocity = velocity;
  float phaseV = texture2D(textureVelocity, uv).w;

  vec3 toCentral = vec3(0.0) - position;
  // 避免出现一直绕圈的现象
  toCentral.y *= 2.5;
  velocity += normalize(toCentral) * 0.001;

  for(float y = .0; y < height; y++) {
    for(float x = .0; x < width; x++) {
      vec2 uv2 = vec2(x + 0.5, y + 0.5) / resolution.xy;
      vec3 otherPosition = texture2D(texturePosition, uv2).xyz;
      vec3 toOther = otherPosition - position;
      float dist = length(toOther);

      // 排除自己
      if(dist < 0.0001) {
        continue;
      }

      // 远离其他蝴蝶
      if(dist < 1.0) {
        velocity -= normalize(toOther) * 0.1;
      }

      // 吸引其他蝴蝶
      if(dist > 10.0) {
        velocity += normalize(toOther) * 0.0005;
      }
    }
  }

  vec3 rayOriginToPosition = position - uRayOrigin;
  float dist = dot(rayOriginToPosition, uRayDirection);
  vec3 closestPoint = uRayOrigin + dist * uRayDirection;
  vec3 toClosest = closestPoint - position;
  float closestDist = length(toClosest);

  // 触发跟随
  if(closestDist < 0.5) {
    velocity += normalize(toClosest) * 0.03;
  }

  // 足够近时，停止
  if(closestDist < 0.05) {
    velocity = vec3(0.0, 0.0, 0.0);
  }

  // 距离较近时限速下降
  if(closestDist < 2.0) {
    limit *= pow(closestDist / 2.0, 0.8);
  }

  // 避免初始速度过快
  if(length(oldVelocity) == 0.0) {
    limit *= 0.2;
  }

  // 限制速度
  if(length(velocity) > limit) {
    velocity = normalize(velocity) * limit;
  }

  // 扇动速度
  float phaseVelocity = 1.0 - dot(normalize(velocity), normalize(oldVelocity));
  phaseVelocity *= 7.0;

  // 避免不动
  phaseVelocity = max(phaseVelocity, 0.05);

  if(closestDist < 0.05) {
    phaseVelocity = max(phaseV - 0.001, 0.0);
  }

  gl_FragColor = vec4(velocity, phaseVelocity);
  // gl_FragColor = vec4(.0);
}