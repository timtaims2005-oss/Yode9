/**
 * React Three Fiber JSX element declarations.
 * This is a MODULE augmentation file — the `export {}` makes it a module so
 * `declare module 'react'` augments the real React types without shadowing them.
 * TypeScript applies module augmentations from all compiled module files globally.
 */

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      // Lights
      ambientLight: Record<string, unknown>;
      directionalLight: Record<string, unknown>;
      pointLight: Record<string, unknown>;
      spotLight: Record<string, unknown>;
      hemisphereLight: Record<string, unknown>;
      rectAreaLight: Record<string, unknown>;
      // Scene
      color: Record<string, unknown>;
      fog: Record<string, unknown>;
      // Objects
      group: Record<string, unknown>;
      mesh: Record<string, unknown>;
      line: Record<string, unknown>;
      line_: Record<string, unknown>;
      lineLoop: Record<string, unknown>;
      lineSegments: Record<string, unknown>;
      points: Record<string, unknown>;
      sprite: Record<string, unknown>;
      instancedMesh: Record<string, unknown>;
      skinnedMesh: Record<string, unknown>;
      bone: Record<string, unknown>;
      // Geometries
      bufferGeometry: Record<string, unknown>;
      instancedBufferGeometry: Record<string, unknown>;
      boxGeometry: Record<string, unknown>;
      capsuleGeometry: Record<string, unknown>;
      circleGeometry: Record<string, unknown>;
      coneGeometry: Record<string, unknown>;
      cylinderGeometry: Record<string, unknown>;
      dodecahedronGeometry: Record<string, unknown>;
      edgesGeometry: Record<string, unknown>;
      extrudeGeometry: Record<string, unknown>;
      icosahedronGeometry: Record<string, unknown>;
      latheGeometry: Record<string, unknown>;
      octahedronGeometry: Record<string, unknown>;
      planeGeometry: Record<string, unknown>;
      polyhedronGeometry: Record<string, unknown>;
      ringGeometry: Record<string, unknown>;
      shapeGeometry: Record<string, unknown>;
      sphereGeometry: Record<string, unknown>;
      tetrahedronGeometry: Record<string, unknown>;
      torusGeometry: Record<string, unknown>;
      torusKnotGeometry: Record<string, unknown>;
      tubeGeometry: Record<string, unknown>;
      wireframeGeometry: Record<string, unknown>;
      // Attributes
      bufferAttribute: Record<string, unknown>;
      instancedBufferAttribute: Record<string, unknown>;
      float32BufferAttribute: Record<string, unknown>;
      int32BufferAttribute: Record<string, unknown>;
      // Materials
      shaderMaterial: Record<string, unknown>;
      rawShaderMaterial: Record<string, unknown>;
      meshBasicMaterial: Record<string, unknown>;
      meshDepthMaterial: Record<string, unknown>;
      meshLambertMaterial: Record<string, unknown>;
      meshMatcapMaterial: Record<string, unknown>;
      meshNormalMaterial: Record<string, unknown>;
      meshPhongMaterial: Record<string, unknown>;
      meshPhysicalMaterial: Record<string, unknown>;
      meshStandardMaterial: Record<string, unknown>;
      meshToonMaterial: Record<string, unknown>;
      lineBasicMaterial: Record<string, unknown>;
      lineDashedMaterial: Record<string, unknown>;
      pointsMaterial: Record<string, unknown>;
      spriteMaterial: Record<string, unknown>;
      shadowMaterial: Record<string, unknown>;
      // Cameras
      perspectiveCamera: Record<string, unknown>;
      orthographicCamera: Record<string, unknown>;
      // Textures
      texture: Record<string, unknown>;
      videoTexture: Record<string, unknown>;
      dataTexture: Record<string, unknown>;
      cubeTexture: Record<string, unknown>;
      // Helpers
      axesHelper: Record<string, unknown>;
      boxHelper: Record<string, unknown>;
      cameraHelper: Record<string, unknown>;
      gridHelper: Record<string, unknown>;
      polarGridHelper: Record<string, unknown>;
      skeletonHelper: Record<string, unknown>;
    }
  }
}

declare module 'react/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements {
      ambientLight: Record<string, unknown>;
      directionalLight: Record<string, unknown>;
      pointLight: Record<string, unknown>;
      spotLight: Record<string, unknown>;
      hemisphereLight: Record<string, unknown>;
      rectAreaLight: Record<string, unknown>;
      color: Record<string, unknown>;
      fog: Record<string, unknown>;
      group: Record<string, unknown>;
      mesh: Record<string, unknown>;
      line: Record<string, unknown>;
      line_: Record<string, unknown>;
      lineLoop: Record<string, unknown>;
      lineSegments: Record<string, unknown>;
      points: Record<string, unknown>;
      sprite: Record<string, unknown>;
      instancedMesh: Record<string, unknown>;
      skinnedMesh: Record<string, unknown>;
      bone: Record<string, unknown>;
      bufferGeometry: Record<string, unknown>;
      instancedBufferGeometry: Record<string, unknown>;
      boxGeometry: Record<string, unknown>;
      capsuleGeometry: Record<string, unknown>;
      circleGeometry: Record<string, unknown>;
      coneGeometry: Record<string, unknown>;
      cylinderGeometry: Record<string, unknown>;
      dodecahedronGeometry: Record<string, unknown>;
      edgesGeometry: Record<string, unknown>;
      extrudeGeometry: Record<string, unknown>;
      icosahedronGeometry: Record<string, unknown>;
      latheGeometry: Record<string, unknown>;
      octahedronGeometry: Record<string, unknown>;
      planeGeometry: Record<string, unknown>;
      polyhedronGeometry: Record<string, unknown>;
      ringGeometry: Record<string, unknown>;
      shapeGeometry: Record<string, unknown>;
      sphereGeometry: Record<string, unknown>;
      tetrahedronGeometry: Record<string, unknown>;
      torusGeometry: Record<string, unknown>;
      torusKnotGeometry: Record<string, unknown>;
      tubeGeometry: Record<string, unknown>;
      wireframeGeometry: Record<string, unknown>;
      bufferAttribute: Record<string, unknown>;
      instancedBufferAttribute: Record<string, unknown>;
      float32BufferAttribute: Record<string, unknown>;
      int32BufferAttribute: Record<string, unknown>;
      shaderMaterial: Record<string, unknown>;
      rawShaderMaterial: Record<string, unknown>;
      meshBasicMaterial: Record<string, unknown>;
      meshDepthMaterial: Record<string, unknown>;
      meshLambertMaterial: Record<string, unknown>;
      meshMatcapMaterial: Record<string, unknown>;
      meshNormalMaterial: Record<string, unknown>;
      meshPhongMaterial: Record<string, unknown>;
      meshPhysicalMaterial: Record<string, unknown>;
      meshStandardMaterial: Record<string, unknown>;
      meshToonMaterial: Record<string, unknown>;
      lineBasicMaterial: Record<string, unknown>;
      lineDashedMaterial: Record<string, unknown>;
      pointsMaterial: Record<string, unknown>;
      spriteMaterial: Record<string, unknown>;
      shadowMaterial: Record<string, unknown>;
      perspectiveCamera: Record<string, unknown>;
      orthographicCamera: Record<string, unknown>;
      texture: Record<string, unknown>;
      videoTexture: Record<string, unknown>;
      dataTexture: Record<string, unknown>;
      cubeTexture: Record<string, unknown>;
      axesHelper: Record<string, unknown>;
      boxHelper: Record<string, unknown>;
      cameraHelper: Record<string, unknown>;
      gridHelper: Record<string, unknown>;
      polarGridHelper: Record<string, unknown>;
      skeletonHelper: Record<string, unknown>;
    }
  }
}

declare module 'react/jsx-dev-runtime' {
  namespace JSX {
    interface IntrinsicElements {
      ambientLight: Record<string, unknown>;
      directionalLight: Record<string, unknown>;
      pointLight: Record<string, unknown>;
      spotLight: Record<string, unknown>;
      hemisphereLight: Record<string, unknown>;
      color: Record<string, unknown>;
      group: Record<string, unknown>;
      mesh: Record<string, unknown>;
      line_: Record<string, unknown>;
      lineLoop: Record<string, unknown>;
      lineSegments: Record<string, unknown>;
      points: Record<string, unknown>;
      bufferGeometry: Record<string, unknown>;
      boxGeometry: Record<string, unknown>;
      circleGeometry: Record<string, unknown>;
      icosahedronGeometry: Record<string, unknown>;
      planeGeometry: Record<string, unknown>;
      sphereGeometry: Record<string, unknown>;
      torusGeometry: Record<string, unknown>;
      bufferAttribute: Record<string, unknown>;
      shaderMaterial: Record<string, unknown>;
      meshBasicMaterial: Record<string, unknown>;
      meshStandardMaterial: Record<string, unknown>;
      lineBasicMaterial: Record<string, unknown>;
      pointsMaterial: Record<string, unknown>;
    }
  }
}

export {};
