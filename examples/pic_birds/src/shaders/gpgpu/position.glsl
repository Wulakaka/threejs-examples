// shader for bird's position

uniform float time;
uniform float delta;

void main() {

  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 tmpPos = texture2D(texturePosition, uv);
  vec3 position = tmpPos.xyz;
  // 速度向量
  vec3 velocity = texture2D(textureVelocity, uv).xyz;

  // 相位值 用于表示翅膀煽动
  float phase = tmpPos.w;

  phase = mod((phase + delta +
    length(velocity.xz) * delta * 3. +
    max(velocity.y, 0.0) * delta * 6.), 62.83);

  gl_FragColor = vec4(position + velocity * delta * 15., phase);

}
