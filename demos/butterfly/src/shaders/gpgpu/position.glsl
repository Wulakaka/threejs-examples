uniform float uTime;
uniform float uDelta;
void main() {
  vec4 position = texture2D(texturePosition, vec2(0.5, 0.5));
  vec4 velocity = texture2D(textureVelocity, vec2(0.5, 0.5));
  position += velocity * uDelta;
  position.w = mod(position.w, 1.0);
  gl_FragColor = position;
}