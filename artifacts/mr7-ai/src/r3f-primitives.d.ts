export {};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      line_: Record<string, unknown>;
      lineLoop: Record<string, unknown>;
      lineSegments: Record<string, unknown>;
      bufferGeometry: Record<string, unknown>;
      bufferAttribute: Record<string, unknown>;
      shaderMaterial: Record<string, unknown>;
      lineBasicMaterial: Record<string, unknown>;
      points: Record<string, unknown>;
      pointsMaterial: Record<string, unknown>;
    }
  }
}
