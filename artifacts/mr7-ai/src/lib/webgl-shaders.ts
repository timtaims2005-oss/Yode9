/**
 * Advanced WebGL 2.0 shaders for holographic effects
 * Using GLSL for maximum performance and visual quality
 */

// Holographic scan line shader
export const holoScanLineShader = `
  uniform float time;
  uniform vec2 resolution;
  uniform vec3 color;
  
  varying vec2 vUv;
  
  void main() {
    vec2 uv = vUv;
    
    // Scan line effect
    float scanLine = sin(uv.y * 100.0 + time * 2.0) * 0.5 + 0.5;
    scanLine = pow(scanLine, 8.0);
    
    // Horizontal glow
    float glow = smoothstep(0.0, 0.1, uv.y) * smoothstep(1.0, 0.9, uv.y);
    
    // Vertical distortion
    float distortion = sin(uv.y * 50.0 + time) * 0.002;
    uv.x += distortion;
    
    // Edge fade
    float edgeFade = smoothstep(0.0, 0.05, uv.x) * smoothstep(1.0, 0.95, uv.x);
    
    vec3 finalColor = color * (scanLine * 0.3 + glow * 0.7) * edgeFade;
    float alpha = (scanLine + glow) * edgeFade * 0.6;
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

// Neural network visualization shader
export const neuralNetworkShader = `
  uniform float time;
  uniform vec2 resolution;
  uniform float intensity;
  
  varying vec2 vUv;
  
  // Noise function for organic movement
  float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }
  
  void main() {
    vec2 uv = vUv;
    
    // Multiple layers of noise for depth
    float n1 = noise(uv * 10.0 + time * 0.1);
    float n2 = noise(uv * 20.0 - time * 0.15);
    float n3 = noise(uv * 5.0 + time * 0.05);
    
    // Combine noise layers
    float pattern = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
    
    // Pulsing effect
    float pulse = sin(time * 2.0) * 0.5 + 0.5;
    
    // Color gradient
    vec3 color1 = vec3(0.886, 0.071, 0.153); // #e21227
    vec3 color2 = vec3(0.0, 0.898, 1.0);     // #00e5ff
    vec3 finalColor = mix(color1, color2, pattern * pulse);
    
    // Alpha based on intensity
    float alpha = pattern * intensity * 0.4;
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

// Particle system shader for high-performance rendering
export const particleShader = `
  attribute float size;
  attribute vec3 color;
  
  varying vec3 vColor;
  
  uniform float time;
  uniform float pixelRatio;
  
  void main() {
    vColor = color;
    
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    
    // Pulsing size
    float pulse = sin(time * 2.0 + position.x * 10.0) * 0.5 + 0.5;
    float finalSize = size * pixelRatio * (1.0 + pulse * 0.3);
    
    gl_PointSize = finalSize * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Holographic bubble shader
export const holoBubbleShader = `
  uniform float time;
  uniform vec3 color;
  uniform float opacity;
  
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  
  void main() {
    // Fresnel effect for edge glow
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = 1.0 - dot(viewDir, vNormal);
    fresnel = pow(fresnel, 3.0);
    
    // Animated pattern
    float pattern = sin(vNormal.x * 10.0 + time) * 
                    sin(vNormal.y * 10.0 + time) * 
                    sin(vNormal.z * 10.0 + time);
    
    // Combine effects
    vec3 finalColor = color * (0.5 + fresnel * 0.5 + pattern * 0.2);
    float alpha = opacity * (0.3 + fresnel * 0.7);
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

// Ray marching shader for volumetric effects
export const volumetricShader = `
  uniform float time;
  uniform vec2 resolution;
  uniform vec3 cameraPos;
  
  varying vec2 vUv;
  
  // Signed distance function for sphere
  float sdSphere(vec3 p, float r) {
    return length(p) - r;
  }
  
  // Signed distance function for box
  float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
  }
  
  // Scene SDF
  float map(vec3 p) {
    float t = time * 0.5;
    
    // Rotating sphere
    vec3 rp = p;
    rp.xy *= mat2(cos(t), -sin(t), sin(t), cos(t));
    float sphere = sdSphere(rp, 1.0);
    
    // Rotating box
    vec3 bp = p;
    bp.xz *= mat2(cos(t * 0.7), -sin(t * 0.7), sin(t * 0.7), cos(t * 0.7));
    float box = sdBox(bp, vec3(0.5));
    
    return min(sphere, box);
  }
  
  // Calculate normal
  vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
      map(p + e.xyy) - map(p - e.xyy),
      map(p + e.yxy) - map(p - e.yxy),
      map(p + e.yyx) - map(p - e.yyx)
    ));
  }
  
  void main() {
    vec2 uv = (vUv - 0.5) * 2.0;
    uv.x *= resolution.x / resolution.y;
    
    // Ray direction
    vec3 rayDir = normalize(vec3(uv, -1.0));
    
    // Ray march
    float t = 0.0;
    vec3 p;
    bool hit = false;
    
    for(int i = 0; i < 64; i++) {
      p = cameraPos + rayDir * t;
      float d = map(p);
      
      if(d < 0.001) {
        hit = true;
        break;
      }
      
      t += d;
      if(t > 10.0) break;
    }
    
    vec3 color = vec3(0.0);
    
    if(hit) {
      vec3 normal = calcNormal(p);
      
      // Lighting
      vec3 lightDir = normalize(vec3(1.0, 1.0, -1.0));
      float diffuse = max(dot(normal, lightDir), 0.0);
      float specular = pow(max(dot(reflect(-lightDir, normal), -rayDir), 0.0), 32.0);
      
      // Holographic color
      vec3 color1 = vec3(0.886, 0.071, 0.153);
      vec3 color2 = vec3(0.0, 0.898, 1.0);
      color = mix(color1, color2, normal.y * 0.5 + 0.5);
      
      color = color * (diffuse * 0.7 + 0.3) + vec3(1.0) * specular * 0.5;
      
      // Edge glow
      float edge = 1.0 - abs(dot(normal, -rayDir));
      edge = pow(edge, 3.0);
      color += color * edge * 0.5;
    }
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

/**
 * High-performance particle system using instanced rendering
 */
export class ParticleSystem {
  private maxParticles: number;
  private particleData: Float32Array;
  private velocityData: Float32Array;
  private colorData: Float32Array;
  
  constructor(maxParticles: number = 10000) {
    this.maxParticles = maxParticles;
    this.particleData = new Float32Array(maxParticles * 3);
    this.velocityData = new Float32Array(maxParticles * 3);
    this.colorData = new Float32Array(maxParticles * 3);
    
    this.initialize();
  }
  
  private initialize() {
    for (let i = 0; i < this.maxParticles; i++) {
      const i3 = i * 3;
      
      // Random position in sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = Math.random() * 5;
      
      this.particleData[i3] = r * Math.sin(phi) * Math.cos(theta);
      this.particleData[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      this.particleData[i3 + 2] = r * Math.cos(phi);
      
      // Random velocity
      this.velocityData[i3] = (Math.random() - 0.5) * 0.01;
      this.velocityData[i3 + 1] = (Math.random() - 0.5) * 0.01;
      this.velocityData[i3 + 2] = (Math.random() - 0.5) * 0.01;
      
      // Color gradient
      const t = Math.random();
      this.colorData[i3] = 0.886 * (1 - t) + 0 * t;
      this.colorData[i3 + 1] = 0.071 * (1 - t) + 0.898 * t;
      this.colorData[i3 + 2] = 0.153 * (1 - t) + 1.0 * t;
    }
  }
  
  update(deltaTime: number) {
    for (let i = 0; i < this.maxParticles; i++) {
      const i3 = i * 3;
      
      // Update position
      this.particleData[i3] += this.velocityData[i3] * deltaTime;
      this.particleData[i3 + 1] += this.velocityData[i3 + 1] * deltaTime;
      this.particleData[i3 + 2] += this.velocityData[i3 + 2] * deltaTime;
      
      // Boundary check (wrap around)
      for (let j = 0; j < 3; j++) {
        if (this.particleData[i3 + j] > 5) this.particleData[i3 + j] = -5;
        if (this.particleData[i3 + j] < -5) this.particleData[i3 + j] = 5;
      }
    }
  }
  
  getPositions(): Float32Array {
    return this.particleData;
  }
  
  getColors(): Float32Array {
    return this.colorData;
  }
}

/**
 * Optimized renderer using requestAnimationFrame and delta time
 */
export class OptimizedRenderer {
  private lastTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 60;
  
  constructor(private updateCallback: (deltaTime: number) => void) {}
  
  start() {
    this.lastTime = performance.now();
    this.animate();
  }
  
  private animate = () => {
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    
    // Calculate FPS
    this.frameCount++;
    if (this.frameCount % 60 === 0) {
      this.fps = 1 / deltaTime;
    }
    
    // Update with delta time for consistent speed
    this.updateCallback(deltaTime);
    
    requestAnimationFrame(this.animate);
  };
  
  getFPS(): number {
    return this.fps;
  }
}
