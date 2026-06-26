/**
 * Ultra HD Shader Library — WebGL 2.0 / GLSL 300 es
 * Ray Tracing محاكى، PBR إضاءة، تأثيرات حجمية
 */

// ── Vertex Shader مشترك ──────────────────────────────────────────────────────
export const ultraVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vViewDir;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

// ── PBR (Physically Based Rendering) ─────────────────────────────────────────
export const pbrFragmentShader = `
  uniform float time;
  uniform vec3  baseColor;
  uniform float metalness;
  uniform float roughness;
  uniform float emissiveStrength;
  uniform vec3  lightPos[4];
  uniform vec3  lightColor[4];

  varying vec2  vUv;
  varying vec3  vNormal;
  varying vec3  vWorldPos;
  varying vec3  vViewDir;

  const float PI = 3.14159265359;

  float DistributionGGX(vec3 N, vec3 H, float r) {
    float a = r * r;
    float a2 = a * a;
    float NdotH = max(dot(N, H), 0.0);
    float denom = (NdotH * NdotH * (a2 - 1.0) + 1.0);
    return a2 / (PI * denom * denom);
  }

  float GeometrySchlick(float NdotV, float r) {
    float k = (r + 1.0) * (r + 1.0) / 8.0;
    return NdotV / (NdotV * (1.0 - k) + k);
  }

  float GeometrySmith(vec3 N, vec3 V, vec3 L, float r) {
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    return GeometrySchlick(NdotV, r) * GeometrySchlick(NdotL, r);
  }

  vec3 FresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
  }

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vViewDir);

    vec3 F0 = mix(vec3(0.04), baseColor, metalness);
    vec3 Lo = vec3(0.0);

    for(int i = 0; i < 4; i++) {
      vec3 L = normalize(lightPos[i] - vWorldPos);
      vec3 H = normalize(V + L);
      float dist = length(lightPos[i] - vWorldPos);
      float atten = 1.0 / (dist * dist);
      vec3 radiance = lightColor[i] * atten;

      float NDF = DistributionGGX(N, H, roughness);
      float G = GeometrySmith(N, V, L, roughness);
      vec3 F = FresnelSchlick(max(dot(H, V), 0.0), F0);

      vec3 num = NDF * G * F;
      float denom = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;
      vec3 specular = num / denom;

      vec3 kD = (vec3(1.0) - F) * (1.0 - metalness);
      float NdotL = max(dot(N, L), 0.0);
      Lo += (kD * baseColor / PI + specular) * radiance * NdotL;
    }

    vec3 ambient = vec3(0.03) * baseColor;
    float pulse = sin(time * 1.5) * 0.5 + 0.5;
    vec3 emissive = baseColor * emissiveStrength * pulse;

    vec3 color = ambient + Lo + emissive;
    color = color / (color + vec3(1.0)); // Tone mapping
    color = pow(color, vec3(1.0 / 2.2)); // Gamma correction

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ── Ray Marching محاكى ────────────────────────────────────────────────────────
export const rayMarchVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const rayMarchFragmentShader = `
  uniform float time;
  uniform vec2  resolution;
  uniform vec3  cameraPos;
  uniform float quality;

  varying vec2 vUv;

  const int MAX_STEPS = 128;
  const float MAX_DIST = 20.0;
  const float SURF_DIST = 0.001;
  const float PI = 3.14159265;

  // ── Noise ────────────────────────────────────────────────────────────────
  float hash(vec3 p) {
    p = fract(p * vec3(443.897, 441.423, 437.195));
    p += dot(p, p.yzx + 19.19);
    return fract((p.x + p.y) * p.z);
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x),
          mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
          mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
  }

  float fbm(vec3 p) {
    float v = 0.0, amp = 0.5;
    for(int i = 0; i < 5; i++) {
      v += amp * noise(p);
      p = p * 2.1 + vec3(1.7, 9.2, 2.3);
      amp *= 0.5;
    }
    return v;
  }

  // ── SDF ──────────────────────────────────────────────────────────────────
  float sdSphere(vec3 p, float r) { return length(p) - r; }

  float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
  }

  float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
  }

  mat2 rot(float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)); }

  // ── Scene ────────────────────────────────────────────────────────────────
  vec2 map(vec3 p) {
    float t = time * 0.4;

    // Core sphere with distortion
    vec3 sp = p;
    float n = fbm(p * 1.5 + t * 0.3) * 0.4;
    float core = sdSphere(sp, 1.0 + n);

    // Orbiting torus rings
    vec3 tp1 = p;
    tp1.xz = rot(t * 0.7) * tp1.xz;
    tp1.xy = rot(t * 0.4) * tp1.xy;
    float ring1 = sdTorus(tp1, vec2(1.8, 0.04));

    vec3 tp2 = p;
    tp2.yz = rot(t * 0.5) * tp2.yz;
    tp2.xz = rot(t * 0.3) * tp2.xz;
    float ring2 = sdTorus(tp2, vec2(2.5, 0.03));

    // Data cube
    vec3 bp = p - vec3(3.0, 0.0, 0.0);
    bp.xy = rot(t * 0.6) * bp.xy;
    bp.xz = rot(t * 0.4) * bp.xz;
    float cube = sdBox(bp, vec3(0.4));

    float scene = min(min(core, ring1), min(ring2, cube));
    float id = core < ring1 ? 0.0 : (ring1 < ring2 ? 1.0 : (cube < ring2 ? 3.0 : 2.0));
    return vec2(scene, id);
  }

  vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
      map(p + e.xyy).x - map(p - e.xyy).x,
      map(p + e.yxy).x - map(p - e.yxy).x,
      map(p + e.yyx).x - map(p - e.yyx).x
    ));
  }

  // ── Soft shadows ─────────────────────────────────────────────────────────
  float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
    float res = 1.0;
    float t = mint;
    for(int i = 0; i < 32; i++) {
      float h = map(ro + rd * t).x;
      if(h < 0.001) return 0.0;
      res = min(res, k * h / t);
      t += clamp(h, 0.01, 0.2);
      if(t > maxt) break;
    }
    return clamp(res, 0.0, 1.0);
  }

  // ── Ambient Occlusion ────────────────────────────────────────────────────
  float calcAO(vec3 pos, vec3 nor) {
    float occ = 0.0, sca = 1.0;
    for(int i = 0; i < 5; i++) {
      float h = 0.01 + 0.12 * float(i) / 4.0;
      float d = map(pos + h * nor).x;
      occ += (h - d) * sca;
      sca *= 0.95;
      if(occ > 0.35) break;
    }
    return clamp(1.0 - 3.0 * occ, 0.0, 1.0) * (0.5 + 0.5 * nor.y);
  }

  // ── Volumetric Fog ───────────────────────────────────────────────────────
  vec4 volumetricFog(vec3 ro, vec3 rd, float tmax) {
    vec4 sum = vec4(0.0);
    float t = 0.5;
    for(int i = 0; i < 48; i++) {
      if(sum.a > 0.99 || t > tmax) break;
      vec3 pos = ro + t * rd;
      float dens = fbm(pos * 0.8 + time * 0.1) - 0.3;
      if(dens > 0.0) {
        vec3 fogCol = mix(vec3(0.886, 0.071, 0.153), vec3(0.0, 0.898, 1.0),
                         fbm(pos * 1.2 - time * 0.08));
        vec4 col = vec4(fogCol, dens * 0.15);
        col.rgb *= col.a;
        sum += col * (1.0 - sum.a);
      }
      t += max(0.1, 0.15 * t);
    }
    return clamp(sum, 0.0, 1.0);
  }

  void main() {
    vec2 uv = (vUv - 0.5) * 2.0;
    uv.x *= resolution.x / resolution.y;

    // Camera
    vec3 ro = cameraPos;
    vec3 target = vec3(0.0);
    vec3 ww = normalize(target - ro);
    vec3 uu = normalize(cross(ww, vec3(0,1,0)));
    vec3 vv = cross(uu, ww);
    vec3 rd = normalize(uv.x * uu + uv.y * vv + 1.6 * ww);

    // Ray march
    float t = 0.1;
    float id = -1.0;
    bool hit = false;
    for(int i = 0; i < MAX_STEPS; i++) {
      vec2 res = map(ro + rd * t);
      if(res.x < SURF_DIST) { hit = true; id = res.y; break; }
      if(t > MAX_DIST) break;
      t += res.x * 0.9;
    }

    vec3 col = vec3(0.0);

    if(hit) {
      vec3 pos = ro + rd * t;
      vec3 nor = calcNormal(pos);

      // Material colors
      vec3 matCol;
      float metalness = 0.0;
      if(id < 0.5) {
        matCol = mix(vec3(0.886, 0.071, 0.153), vec3(1.0, 0.3, 0.0),
                    fbm(pos * 2.0 + time * 0.2));
        metalness = 0.3;
      } else if(id < 1.5) {
        matCol = vec3(0.0, 0.898, 1.0);
        metalness = 0.9;
      } else if(id < 2.5) {
        matCol = vec3(0.5, 0.0, 1.0);
        metalness = 0.7;
      } else {
        matCol = vec3(0.0, 1.0, 0.5);
        metalness = 0.8;
      }

      // Lighting
      vec3 lightDir1 = normalize(vec3(2.0, 3.0, -1.0));
      vec3 lightDir2 = normalize(vec3(-2.0, -1.0, 2.0));
      float diff1 = max(dot(nor, lightDir1), 0.0);
      float diff2 = max(dot(nor, lightDir2), 0.0) * 0.4;

      // Specular (Blinn-Phong)
      vec3 halfDir = normalize(lightDir1 - rd);
      float spec = pow(max(dot(nor, halfDir), 0.0), 64.0) * (0.3 + metalness * 0.7);

      // Fresnel edge glow
      float fresnel = pow(1.0 - max(dot(nor, -rd), 0.0), 3.0);

      // Soft shadow
      float shadow = softShadow(pos + nor * 0.01, lightDir1, 0.02, 8.0, 12.0);

      // AO
      float ao = calcAO(pos, nor);

      // Reflections (screen-space approximation)
      vec3 reflDir = reflect(rd, nor);
      vec2 reflUV = vUv + reflDir.xy * 0.1 * metalness;
      vec3 reflCol = mix(vec3(0.886, 0.071, 0.153), vec3(0.0, 0.898, 1.0),
                        fbm(reflDir * 2.0 + time * 0.1));

      col  = matCol * (diff1 * shadow + diff2) * ao;
      col += vec3(spec) * shadow;
      col += reflCol * metalness * fresnel * 0.5;
      col += matCol * fresnel * 0.3; // Rim light

      // Emissive pulse
      float pulse = sin(time * 2.0 + length(pos) * 3.0) * 0.5 + 0.5;
      col += matCol * pulse * 0.15;
    }

    // Volumetric fog / atmosphere
    vec4 fog = volumetricFog(ro, rd, t);
    col = col * (1.0 - fog.a) + fog.rgb;

    // Background gradient
    if(!hit) {
      float bg = fbm(rd * 2.0 + time * 0.05);
      col = mix(vec3(0.02, 0.0, 0.05), vec3(0.0, 0.03, 0.08), rd.y * 0.5 + 0.5);
      col += vec3(0.886, 0.071, 0.153) * bg * 0.05;
    }

    // Vignette
    float vig = 1.0 - smoothstep(0.5, 1.5, length(vUv - 0.5) * 2.0);
    col *= vig;

    // Tone mapping (ACES)
    col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
    col = pow(max(col, 0.0), vec3(1.0 / 2.2));

    gl_FragColor = vec4(col, 1.0);
  }
`;

// ── Bloom Post-Process ────────────────────────────────────────────────────────
export const bloomVertexShader = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
`;

export const bloomFragmentShader = `
  uniform sampler2D tDiffuse;
  uniform vec2 resolution;
  uniform float threshold;
  uniform float strength;
  uniform float radius;

  varying vec2 vUv;

  vec3 sampleBlur(sampler2D tex, vec2 uv, vec2 dir) {
    vec3 col = vec3(0.0);
    float total = 0.0;
    for(int i = -8; i <= 8; i++) {
      float w = exp(-float(i*i) / (2.0 * radius * radius));
      col += texture2D(tex, uv + dir * float(i)).rgb * w;
      total += w;
    }
    return col / total;
  }

  void main() {
    vec3 color = texture2D(tDiffuse, vUv).rgb;
    float brightness = dot(color, vec3(0.2126, 0.7152, 0.0722));
    vec3 bright = color * step(threshold, brightness);

    vec2 px = 1.0 / resolution;
    vec3 blurH = sampleBlur(tDiffuse, vUv, vec2(px.x * 2.0, 0.0));
    vec3 blurV = sampleBlur(tDiffuse, vUv, vec2(0.0, px.y * 2.0));
    vec3 bloom = (blurH + blurV) * 0.5;
    float bloomBright = dot(bloom, vec3(0.2126, 0.7152, 0.0722));
    bloom *= step(threshold * 0.5, bloomBright);

    gl_FragColor = vec4(color + bloom * strength, 1.0);
  }
`;

// ── Rain Shader ───────────────────────────────────────────────────────────────
export const rainVertexShader = `
  attribute float speed;
  attribute float opacity;
  varying float vOpacity;
  uniform float time;

  void main() {
    vOpacity = opacity;
    vec3 pos = position;
    pos.y = mod(pos.y - time * speed * 3.0, 20.0) - 10.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 1.5;
  }
`;

export const rainFragmentShader = `
  varying float vOpacity;
  void main() {
    gl_FragColor = vec4(0.6, 0.8, 1.0, vOpacity * 0.4);
  }
`;

// ── Smoke / Volumetric Particle Shader ───────────────────────────────────────
export const smokeVertexShader = `
  attribute float size;
  attribute float life;
  attribute vec3  color;
  varying float   vLife;
  varying vec3    vColor;
  uniform float   time;
  uniform float   pixelRatio;

  void main() {
    vLife  = life;
    vColor = color;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    float sz = size * pixelRatio * (1.0 + life * 2.0) * (300.0 / -mvPos.z);
    gl_PointSize = sz;
    gl_Position  = projectionMatrix * mvPos;
  }
`;

export const smokeFragmentShader = `
  varying float vLife;
  varying vec3  vColor;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if(d > 0.5) discard;
    float alpha = (1.0 - d * 2.0) * (1.0 - vLife) * 0.6;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

// ── Chrome / Mirror Reflection Shader ────────────────────────────────────────
export const chromeVertexShader = `
  varying vec3 vReflect;
  varying vec3 vNormal;
  uniform float time;

  void main() {
    vec3 norm = normalize(normalMatrix * normal);
    vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    vec3 I = normalize(worldPos - cameraPosition);
    vReflect = reflect(I, norm);
    vNormal = norm;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const chromeFragmentShader = `
  varying vec3 vReflect;
  varying vec3 vNormal;
  uniform float time;

  void main() {
    vec3 r = normalize(vReflect);
    // Procedural environment map
    float env = 0.5 + 0.5 * sin(r.x * 8.0 + time) * sin(r.y * 6.0 - time * 0.7)
              * sin(r.z * 7.0 + time * 1.3);
    vec3 envCol = mix(vec3(0.886, 0.071, 0.153), vec3(0.0, 0.898, 1.0), env);

    float fresnel = pow(1.0 - max(dot(vNormal, normalize(cameraPosition)), 0.0), 2.0);
    vec3 col = mix(vec3(0.05), envCol, fresnel * 0.9 + 0.1);

    gl_FragColor = vec4(col, 0.9);
  }
`;

// ── Holographic Grid / Matrix Rain ────────────────────────────────────────────
export const matrixRainShader = `
  uniform float time;
  uniform vec2  resolution;
  varying vec2  vUv;

  float random(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec2 uv = vUv;
    float cols = 40.0;
    float rows = 80.0;
    vec2 cell = floor(uv * vec2(cols, rows));

    float r = random(cell);
    float speed = r * 3.0 + 1.0;
    float offset = r * 10.0;
    float t = mod(time * speed + offset, rows / cols * 2.0);

    float y = fract(uv.y * rows / cols);
    float trail = exp(-max(0.0, (uv.y - t) * rows) * 0.5);

    float bright = step(0.97, random(cell + floor(time * speed * 10.0)));
    float glyph = random(cell * 3.7 + floor(time * speed * 8.0));

    vec3 col = vec3(0.0, 1.0, 0.4) * trail * (0.3 + bright * 0.7);
    col = mix(col, vec3(0.886, 0.071, 0.153) * trail, random(cell + 5.0) * 0.3);

    gl_FragColor = vec4(col, trail * 0.5);
  }
`;

// ── Chromatic Aberration ──────────────────────────────────────────────────────
export const chromaticAberrationShader = `
  uniform sampler2D tDiffuse;
  uniform float     strength;
  uniform vec2      resolution;
  varying vec2      vUv;

  void main() {
    vec2 dir = vUv - 0.5;
    float dist = length(dir);
    vec2 offset = dir * dist * strength / resolution;

    float r = texture2D(tDiffuse, vUv + offset).r;
    float g = texture2D(tDiffuse, vUv).g;
    float b = texture2D(tDiffuse, vUv - offset).b;

    gl_FragColor = vec4(r, g, b, 1.0);
  }
`;

// ── CRT / Glitch Overlay ──────────────────────────────────────────────────────
export const crtGlitchShader = `
  uniform sampler2D tDiffuse;
  uniform float     time;
  uniform float     glitchStrength;
  varying vec2      vUv;

  float noise(float t) {
    return fract(sin(t * 43758.5) * 43758.5);
  }

  void main() {
    vec2 uv = vUv;

    // Scan lines
    float scan = sin(uv.y * 600.0 + time * 10.0) * 0.015;
    float scanMask = 0.85 + 0.15 * sin(uv.y * 3.0);

    // Glitch horizontal shift
    float glitchBand = step(0.97, noise(floor(uv.y * 40.0) + time * 7.0));
    float shift = (noise(time * 34.3) - 0.5) * 0.04 * glitchStrength * glitchBand;
    uv.x += shift;

    // CRT barrel distortion
    vec2 centered = uv - 0.5;
    float barrel = 1.0 + dot(centered, centered) * 0.08;
    uv = centered * barrel + 0.5;

    vec4 col = texture2D(tDiffuse, uv);
    col.rgb *= scanMask;
    col.rgb += vec3(noise(time + uv.y) * 0.03 * glitchStrength);

    gl_FragColor = col;
  }
`;

// ── God Rays (Light Shafts) ───────────────────────────────────────────────────
export const godRaysShader = `
  uniform sampler2D tDiffuse;
  uniform vec2      lightPos;
  uniform float     exposure;
  uniform float     decay;
  uniform float     density;
  uniform float     weight;
  varying vec2      vUv;

  const int NUM_SAMPLES = 64;

  void main() {
    vec2 deltaTextCoord = vUv - lightPos;
    deltaTextCoord *= 1.0 / float(NUM_SAMPLES) * density;
    vec2 uv = vUv;
    float illuminationDecay = 1.0;
    vec4 color = vec4(0.0);

    for(int i = 0; i < NUM_SAMPLES; i++) {
      uv -= deltaTextCoord;
      vec4 sample_ = texture2D(tDiffuse, uv);
      sample_ *= illuminationDecay * weight;
      color += sample_;
      illuminationDecay *= decay;
    }

    color *= exposure;
    vec4 orig = texture2D(tDiffuse, vUv);
    gl_FragColor = orig + color * 0.5;
  }
`;
