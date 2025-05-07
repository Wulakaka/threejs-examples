uniform float uDelta;

void main() {
  vec3 velocity = texture2D(textureVelocity, vec2(0.5, 0.5)).xyz;
  vec3 direction = texture2D(textureDirection, vec2(0.5, 0.5)).xyz;
  vec3 from = direction;
  if(length(velocity) > 0.0) {
    direction = velocity;
  }
  direction = mix(from, direction, uDelta * 0.1);
  gl_FragColor = vec4(direction, 1.0);
}