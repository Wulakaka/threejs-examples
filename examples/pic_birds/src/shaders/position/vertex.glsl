varying vec2 vUv;

attribute vec2 aUv;
void main() {
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectionPosition = projectionMatrix * viewPosition;

  gl_Position = projectionPosition;
  gl_PointSize = 10.0;

  vUv = aUv;

    // // Set the color of the vertex
    // vColor = color;

    // // Pass the texture
}