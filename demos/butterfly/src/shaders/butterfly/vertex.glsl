uniform float uTime;
uniform float uDelta;
uniform sampler2D uTexturePosition;
uniform sampler2D uTextureVelocity;
attribute float aSide;
const float PI = 3.141592653589793;

void main() {

  float angle = sin(uTime * 0.008) * 0.5 + 0.5;
  angle *= PI * 0.4;
  if(aSide < 0.0) {
    angle = PI - angle;
  }

  vec3 tempPos = texture2D(uTexturePosition, vec2(0.5, 0.5)).xyz;
  vec3 pos = tempPos;
  vec3 velocity = texture2D(uTextureVelocity, vec2(0.5, 0.5)).xyz;

  vec3 newPosition = position;
  // 翅膀扇动
  float dist = length(newPosition);
  newPosition.x = cos(angle) * dist;
  newPosition.z = -sin(angle) * dist;

  // 转向
  // 这里 -z 为前方？
  newPosition = mat3(modelMatrix) * newPosition;

  velocity.z *= -1.;
  float xz = length(velocity.xz);
  float xyz = 1.;
  float x = sqrt(1. - velocity.y * velocity.y);

  float cosry = velocity.x / xz;
  float sinry = velocity.z / xz;

  float cosrz = x / xyz;
  float sinrz = velocity.y / xyz;

  mat3 maty = mat3(cosry, 0, -sinry, 0, 1, 0, sinry, 0, cosry);

  mat3 matz = mat3(cosrz, sinrz, 0, -sinrz, cosrz, 0, 0, 0, 1);

  newPosition = maty * matz * newPosition;
  newPosition += pos;

  vec4 modelPosition = vec4(newPosition, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectionPosition = projectionMatrix * viewPosition;
  gl_Position = projectionPosition;
}