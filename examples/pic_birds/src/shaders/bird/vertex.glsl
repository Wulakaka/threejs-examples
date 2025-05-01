attribute vec2 reference;
attribute float birdVertex;

uniform sampler2D texturePosition;
uniform sampler2D textureVelocity;
uniform sampler2D textureColor;

varying vec4 vColor;
varying float z;

uniform float time;

// 只是做了转向和翅膀挥动
void main() {

  vec4 tmpPos = texture2D(texturePosition, reference);
  vec3 pos = tmpPos.xyz;
  vec3 velocity = normalize(texture2D(textureVelocity, reference).xyz);

  // position 是不变值，就是初始位置
  vec3 newPosition = position;

  if(birdVertex == 4.0 || birdVertex == 7.0) {
        // flap wings
    newPosition.y = sin(tmpPos.w) * 5.;
  }

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

  z = newPosition.z;

  vColor = texture2D(textureColor, reference);
  gl_Position = projectionMatrix * viewMatrix * vec4(newPosition, 1.0);
}
