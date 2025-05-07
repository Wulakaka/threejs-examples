uniform vec3 uRayOrigin;
uniform vec3 uRayDirection;

const float SPEED_LIMIT = 0.1;

void main() {
  vec3 tempPos = texture2D(texturePosition, vec2(0.5, 0.5)).xyz;
  vec3 velocity = texture2D(textureVelocity, vec2(0.5, 0.5)).xyz;
  float phaseV = texture2D(textureVelocity, vec2(0.5, 0.5)).w;

  vec3 toCentral = vec3(0.0) - tempPos;
  // 避免出现一直绕圈的现象
  toCentral.y *= 2.5;
  velocity += normalize(toCentral) * 0.001;

  vec3 rayOriginToPosition = tempPos - uRayOrigin;
  float dist = dot(rayOriginToPosition, uRayDirection);
  vec3 closestPoint = uRayOrigin + dist * uRayDirection;
  vec3 toClosest = closestPoint - tempPos;
  float closestDist = length(toClosest);

  // 触发跟随
  if(closestDist < 10.0) {
    velocity += normalize(toClosest) * 0.03;
    if(closestDist < 1.0) {
      velocity *= 0.6;
    }
  }

  if(length(velocity) > SPEED_LIMIT) {
    velocity = normalize(velocity) * SPEED_LIMIT;
  }
  float phaseVelocity = length(velocity);

  if(closestDist < 0.1) {
    velocity = vec3(0.0, 0.0, 0.0);
    phaseVelocity = max(phaseV - 0.001, 0.0);
  }

  gl_FragColor = vec4(velocity, phaseVelocity);
}