uniform float uTime;
uniform float uDelta;
void main() {
  vec3 tempPos = texture2D(texturePosition, vec2(0.5, 0.5)).xyz;
  vec3 tempVel = texture2D(textureVelocity, vec2(0.5, 0.5)).xyz;
  tempPos += tempVel * uDelta;
  gl_FragColor = vec4(tempPos, 1.0);
}