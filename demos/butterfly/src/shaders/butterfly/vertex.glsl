uniform sampler2D uTexturePosition;
uniform sampler2D uTextureDirection;
attribute float aSide;
attribute vec2 aReference;
const float PI = 3.141592653589793;

void main() {

  float phase = texture2D(uTexturePosition, aReference).w;
  // 0 - 1
  float angle = sin(phase * PI);
  angle *= PI * 0.45;
  if(aSide < 0.0) {
    angle = PI - angle;
  }

  vec3 tempPos = texture2D(uTexturePosition, aReference).xyz;
  vec3 pos = tempPos;
  vec3 direction = texture2D(uTextureDirection, aReference).xyz;
  direction = normalize(direction);

  vec3 newPosition = position;
  // 翅膀扇动
  float dist = length(newPosition);
  newPosition.x = cos(angle) * dist;
  newPosition.z = -sin(angle) * dist;

  vec3 modelPosition = mat3(modelMatrix) * newPosition;

  // 转向
  // 这里 +x 为前方
  direction.z *= -1.;
  float xz = length(direction.xz);
  float xyz = 1.;
  float x = sqrt(1. - direction.y * direction.y);

  float cosry = direction.x / xz;
  float sinry = direction.z / xz;

  float cosrz = x / xyz;
  float sinrz = direction.y / xyz;

  mat3 maty = mat3(cosry, 0, -sinry, 0, 1, 0, sinry, 0, cosry);

  mat3 matz = mat3(cosrz, sinrz, 0, -sinrz, cosrz, 0, 0, 0, 1);

  modelPosition = maty * matz * modelPosition;
  modelPosition += pos;

  vec4 viewPosition = viewMatrix * vec4(modelPosition, 1.0);
  vec4 projectionPosition = projectionMatrix * viewPosition;
  gl_Position = projectionPosition;
}