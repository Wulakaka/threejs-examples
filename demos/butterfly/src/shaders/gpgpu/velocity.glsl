uniform vec3 uRayOrigin;
uniform vec3 uRayDirection;

const float SPEED_LIMIT = 0.1;

void main() {
  float limit = SPEED_LIMIT;

  vec3 position = texture2D(texturePosition, vec2(0.5, 0.5)).xyz;
  vec3 velocity = texture2D(textureVelocity, vec2(0.5, 0.5)).xyz;
  vec3 oldVelocity = velocity;
  float phaseV = texture2D(textureVelocity, vec2(0.5, 0.5)).w;

  vec3 toCentral = vec3(0.0) - position;
  // 避免出现一直绕圈的现象
  toCentral.y *= 2.5;
  velocity += normalize(toCentral) * 0.001;

  vec3 rayOriginToPosition = position - uRayOrigin;
  float dist = dot(rayOriginToPosition, uRayDirection);
  vec3 closestPoint = uRayOrigin + dist * uRayDirection;
  vec3 toClosest = closestPoint - position;
  float closestDist = length(toClosest);

  // 触发跟随
  if(closestDist < 10.0) {
    velocity += normalize(toClosest) * 0.03;
    if(closestDist < 1.0) {
      velocity *= 0.6;
    }
  }

  if(closestDist < 0.05) {
    velocity = vec3(0.0, 0.0, 0.0);
  }

  if(closestDist < 2.0) {
    limit *= pow(closestDist / 2.0, 0.8);
  }

  // 避免初始速度过快
  if(length(oldVelocity) == 0.0) {
    limit *= 0.2;
  }
  if(length(velocity) > limit) {
    velocity = normalize(velocity) * limit;
  }

  // 扇动速度
  float phaseVelocity = 1.0 - dot(normalize(velocity), normalize(oldVelocity));
  phaseVelocity *= 15.0;
  phaseVelocity = abs(phaseVelocity);
  // 避免不动
  phaseVelocity = max(phaseVelocity, 0.05);

  if(closestDist < 0.05) {
    phaseVelocity = max(phaseV - 0.001, 0.0);
  }

  gl_FragColor = vec4(velocity, phaseVelocity);
}