uniform float uTime;
uniform float uDelta;
void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 position = texture2D(texturePosition, uv);
  vec4 velocity = texture2D(textureVelocity, uv);
  position += velocity * uDelta * 10.0;
  position.w = mod(position.w, 1.0);
  gl_FragColor = position;
}