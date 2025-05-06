uniform vec3 uRayOrigin;
uniform vec3 uRayDirection;

const float SPEED_LIMIT = 0.1;

void main() {
  vec3 tempPos = texture2D(texturePosition, vec2(0.5, 0.5)).xyz;
  vec3 dir = tempPos - uRayOrigin;
  float dist = dot(dir, uRayDirection);
  vec3 closestPoint = uRayOrigin + dist * uRayDirection;
  vec3 toClosest = closestPoint - tempPos;
  float closestDist = length(toClosest);

  vec3 velocity = texture2D(textureVelocity, vec2(0.5, 0.5)).xyz;
  if(closestDist < 10.0) {
    velocity += normalize(toClosest) * 0.01;
  }

  vec3 toCentral = vec3(0.0) - tempPos;
  velocity += normalize(toCentral) * 0.001;

  if(length(velocity) > SPEED_LIMIT) {
    velocity = normalize(velocity) * SPEED_LIMIT;
  }
  gl_FragColor = vec4(velocity, 1.0);
}