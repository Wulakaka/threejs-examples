uniform float uTime;
attribute float aSide;
const float PI = 3.141592653589793;

void main() {

  float angle = sin(uTime * 0.008) * 0.5 + 0.5;
  angle *= PI * 0.4;
  if(aSide < 0.0) {
    angle = PI - angle;
  }

  vec3 newPosition = position;
  float dist = length(newPosition);
  newPosition.x = cos(angle) * dist;
  newPosition.z = sin(angle) * dist;

  vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectionPosition = projectionMatrix * viewPosition;
  gl_Position = projectionPosition;
}