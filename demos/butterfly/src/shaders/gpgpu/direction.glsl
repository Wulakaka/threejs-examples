uniform float uDelta;
uniform vec3 uRayOrigin;
uniform vec3 uRayDirection;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec3 velocity = texture2D(textureVelocity, uv).xyz;
  vec3 position = texture2D(texturePosition, uv).xyz;
  vec3 direction = texture2D(textureDirection, uv).xyz;
  vec3 from = direction;
  if(length(velocity) > 0.0) {
    direction = velocity;
  }

  vec3 rayOriginToPosition = position - uRayOrigin;
  float dist = dot(rayOriginToPosition, uRayDirection);
  vec3 closestPoint = uRayOrigin + dist * uRayDirection;
  vec3 toClosest = closestPoint - position;
  float closestDist = length(toClosest);

  // 停止时头朝上
  if(closestDist < 0.1) {
    direction.y = abs((normalize(direction) * 0.01).y);
  }

  direction = mix(from, direction, 1.0 / uDelta * 0.003);
  gl_FragColor = vec4(direction, 1.0);
}