uniform sampler2D uTexturePosition;
uniform sampler2D uTextureDirection;
attribute float aSide;
const float PI = 3.141592653589793;

void main() {

  float phase = texture2D(uTexturePosition, vec2(0.5, 0.5)).w;
  // 0 - 1
  float angle = sin(phase * PI);
  angle *= PI * 0.45;
  if(aSide < 0.0) {
    angle = PI - angle;
  }

  vec3 tempPos = texture2D(uTexturePosition, vec2(0.5, 0.5)).xyz;
  vec3 pos = tempPos;
  vec3 direction = texture2D(uTextureDirection, vec2(0.5, 0.5)).xyz;
  direction = normalize(direction);

  vec3 newPosition = position;
  // 翅膀扇动
  float dist = length(newPosition);
  newPosition.x = cos(angle) * dist;
  newPosition.z = -sin(angle) * dist;

  // 转向
  // 这里 +x 为前方
  vec3 modelPosition = mat3(modelMatrix) * newPosition;

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