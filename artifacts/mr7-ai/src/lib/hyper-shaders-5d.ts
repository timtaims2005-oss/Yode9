/**
 * Hyper-Shaders 5D — مكتبة الشيدر خماسية الأبعاد
 * البُعد 1-3: XYZ الفضاء
 * البُعد 4: الطور الزمني / التدوير الرباعي
 * البُعد 5: مجال الوعي الكمومي / الطوبولوجيا الفائقة
 */

// ── Vertex Shader 5D — إسقاط من الفضاء الخماسي ──────────────────────────────
export const hyperVertex5D = `
  uniform float time;
  uniform float dim4Phase;   // البُعد الرابع: طور الدوران الزمني
  uniform float dim5Field;   // البُعد الخامس: قوة مجال الوعي
  uniform float pixelRatio;
  attribute float w4;        // إحداثية البُعد الرابع
  attribute float v5;        // إحداثية البُعد الخامس
  attribute float pSize;
  attribute vec3  pColor;
  varying vec3  vColor;
  varying float vAlpha;
  varying float vDim5;

  // دوران 4D في المستوى XW
  vec3 rotate4D_XW(vec3 p, float w, float angle) {
    float c = cos(angle), s = sin(angle);
    return vec3(c * p.x - s * w, p.y, s * p.x + c * w);
  }

  // دوران 4D في المستوى YW
  vec3 rotate4D_YW(vec3 p, float w, float angle) {
    float c = cos(angle), s = sin(angle);
    return vec3(p.x, c * p.y - s * w, s * p.y + c * w);
  }

  // دوران 4D في المستوى ZW
  vec3 rotate4D_ZW(vec3 p, float w, float angle) {
    float c = cos(angle), s = sin(angle);
    float newZ = c * p.z - s * w;
    float newW = s * p.z + c * w;
    return vec3(p.x, p.y, newZ);
  }

  // إسقاط من 4D إلى 3D (منظور رباعي الأبعاد)
  vec3 project4Dto3D(vec3 p, float w) {
    float wDist = 3.0;
    float scale = wDist / (wDist - w);
    return p * scale;
  }

  // مجال الوعي 5D: تشويه الفضاء بناءً على البُعد الخامس
  vec3 consciousnessWarp(vec3 p, float v5, float t) {
    float field = sin(v5 * 6.28318 + t * 0.7) * dim5Field;
    float warp = cos(v5 * 4.18879 + t * 0.5) * dim5Field * 0.5;
    return p + vec3(
      sin(p.y * 2.0 + t + v5) * field * 0.3,
      cos(p.x * 2.0 - t + v5) * field * 0.3,
      sin(p.z * 1.5 + t * 0.8 + v5) * warp * 0.3
    );
  }

  void main() {
    vColor = pColor;
    vDim5  = v5;

    float t = time;
    float w = w4;

    // تطبيق دورانات 4D (البُعد الرابع يدور مع الزمن)
    vec3 p = position;
    p = rotate4D_XW(p, w, t * dim4Phase * 0.4);
    p = rotate4D_YW(p, w, t * dim4Phase * 0.3);
    p = rotate4D_ZW(p, w, t * dim4Phase * 0.2);

    // إسقاط 4D→3D
    p = project4Dto3D(p, w * sin(t * 0.15));

    // تطبيق تشويه مجال الوعي 5D
    p = consciousnessWarp(p, v5, t);

    // توهج الجسيم مرتبط بالبُعد الخامس
    float consciousness = 0.5 + 0.5 * sin(v5 * 12.566 + t * 1.3);
    float pulseDim5 = 0.7 + 0.3 * sin(t * 2.0 + w4 * 5.0);
    vAlpha = consciousness * pulseDim5;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = pSize * pixelRatio * pulseDim5 * (280.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`;

export const hyperFragment5D = `
  varying vec3  vColor;
  varying float vAlpha;
  varying float vDim5;
  void main() {
    vec2  uv = gl_PointCoord - 0.5;
    float d  = length(uv);
    if(d > 0.5) discard;
    float core  = exp(-d * 8.0);
    float halo  = exp(-d * 3.0) * 0.5;
    float ring5 = exp(-abs(d - 0.35) * 25.0) * vDim5 * 0.8;
    vec3  col5  = mix(vColor, vec3(1.0 - vColor.r, 1.0 - vColor.g, 1.0), vDim5 * 0.4);
    gl_FragColor = vec4(col5, (core + halo + ring5) * vAlpha * 0.9);
  }
`;

// ── Tesseract / Hypercube 5D Shader ──────────────────────────────────────────
export const tesseractVertex5D = `
  uniform float time;
  uniform float dim4Angle;
  uniform float dim5Morph;
  varying vec3  vColor;
  varying float vGlow;

  // دوران ثنائي في 4D
  mat4 rot4D_XW(float a) {
    float c = cos(a), s = sin(a);
    return mat4(c,0,0,s, 0,1,0,0, 0,0,1,0, -s,0,0,c);
  }
  mat4 rot4D_YZ(float a) {
    float c = cos(a), s = sin(a);
    return mat4(1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1);
  }
  mat4 rot4D_XY(float a) {
    float c = cos(a), s = sin(a);
    return mat4(c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1);
  }
  mat4 rot4D_ZW(float a) {
    float c = cos(a), s = sin(a);
    return mat4(1,0,0,0, 0,1,0,0, 0,0,c,s, 0,0,-s,c);
  }

  void main() {
    float t = time;
    // موضع 4D: (x, y, z, w)
    vec4 p4 = vec4(position, sin(position.x + position.y + t * 0.3) * dim5Morph);

    // تطبيق دورانات 4D
    p4 = rot4D_XW(t * dim4Angle * 0.5) * p4;
    p4 = rot4D_YZ(t * dim4Angle * 0.3) * p4;
    p4 = rot4D_ZW(t * dim4Angle * 0.2) * p4;
    p4 = rot4D_XY(t * dim4Angle * 0.15) * p4;

    // إسقاط منظور من 4D إلى 3D
    float wDist = 2.5;
    float scale = wDist / (wDist - p4.w);
    vec3 p3 = p4.xyz * scale;

    // البُعد الخامس: تشويه الوعي
    float v5 = sin(length(position) * 3.0 + t * 0.8);
    p3 += vec3(
      sin(p3.y * 2.5 + t * 0.6) * v5 * dim5Morph * 0.2,
      cos(p3.x * 2.5 - t * 0.5) * v5 * dim5Morph * 0.2,
      sin(p3.z * 2.0 + t * 0.7) * v5 * dim5Morph * 0.15
    );

    // لون مرتبط بالبُعد الرابع والخامس
    float d4norm = (p4.w + 2.0) * 0.25;
    vColor = mix(
      vec3(0.886, 0.071, 0.153),
      mix(vec3(0.0, 0.898, 1.0), vec3(0.6, 0.0, 1.0), d4norm),
      0.5 + 0.5 * sin(t * 0.5 + length(position))
    );
    vGlow = scale * 0.4 + abs(v5) * 0.3;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p3, 1.0);
  }
`;

export const tesseractFragment5D = `
  varying vec3  vColor;
  varying float vGlow;
  void main() {
    gl_FragColor = vec4(vColor + vGlow * 0.4, 0.85 + vGlow * 0.15);
  }
`;

// ── Consciousness Field 5D — مجال الوعي الكمومي ─────────────────────────────
export const consciousnessVertex5D = `
  uniform float time;
  uniform float consciousnessLevel;
  uniform float quantumPhase;
  attribute float phase5;
  attribute float freq5;
  attribute vec3  baseColor;
  varying   vec3  vColor;
  varying   float vPsi;

  // دالة موجة كمومية (wave function) للبُعد الخامس
  float psi5(float x, float y, float z, float w, float v, float t) {
    // 5D Schrödinger-inspired wave
    float r5 = sqrt(x*x + y*y + z*z + w*w + v*v);
    return exp(-r5 * 0.8) * cos(r5 * 4.0 - t * 2.0 + w * 3.0 + v * 5.0);
  }

  void main() {
    float t = time;
    vec3 p = position;

    // إحداثيات البُعد الرابع والخامس
    float w4 = sin(phase5 + t * freq5 * 0.7);
    float v5 = cos(phase5 * 1.618 + t * freq5 * 0.5);

    // دالة الاحتمال الكمومي 5D
    float psi = psi5(p.x, p.y, p.z, w4, v5, t);

    // تشويه الموضع بناءً على الوعي الكمومي
    float strength = consciousnessLevel * 0.5;
    p.x += psi * sin(t * freq5 + phase5) * strength;
    p.y += psi * cos(t * freq5 * 0.8 - phase5) * strength;
    p.z += psi * sin(t * freq5 * 0.6 + phase5 * 2.0) * strength;

    // الكتابة عبر النفق الكمومي (Quantum Tunneling)
    float tunnel = step(0.7, abs(psi) * consciousnessLevel);
    p += normalize(p) * tunnel * 0.3 * sin(t * 3.0 + phase5);

    vPsi   = abs(psi);
    vColor = mix(baseColor,
                 mix(vec3(0.0, 0.898, 1.0), vec3(1.0, 0.0, 0.8), v5 * 0.5 + 0.5),
                 vPsi * 0.7);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

export const consciousnessFragment5D = `
  varying vec3  vColor;
  varying float vPsi;
  void main() {
    vec2  uv = gl_PointCoord - 0.5;
    float d  = length(uv);
    if(d > 0.5) discard;
    float a = exp(-d * 6.0) * (0.4 + vPsi * 0.6);
    float rim = exp(-abs(d - 0.45) * 30.0) * vPsi * 0.8;
    gl_FragColor = vec4(vColor, a + rim);
  }
`;

// ── Dimensional Rift 5D — شق بين الأبعاد ────────────────────────────────────
export const riftVertex5D = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const riftFragment5D = `
  uniform float time;
  uniform vec2  resolution;
  uniform float riftIntensity;
  uniform float dim5Depth;
  varying vec2  vUv;

  float hash21(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
  }

  float noise5D(vec3 p, float w, float v) {
    // ضجيج خماسي الأبعاد
    vec3 i = floor(p);
    vec3 f = smoothstep(0.0, 1.0, fract(p));
    float a = hash21(vec2(i.x + i.y * 7.3, i.z + w * 13.7 + v * 23.1));
    float b = hash21(vec2(i.x + 1.0 + i.y * 7.3, i.z + w * 13.7 + v * 23.1));
    float c = hash21(vec2(i.x + (i.y+1.0)*7.3, i.z + w * 13.7 + v * 23.1));
    float d = hash21(vec2(i.x + 1.0 + (i.y+1.0)*7.3, i.z + w * 13.7 + v * 23.1));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  // شكل الشق بين الأبعاد
  float riftShape(vec2 uv, float t) {
    float y = uv.y;
    float x = uv.x;

    // خط متعرج ديناميكي
    float crack = x - 0.5 * sin(y * 8.0 + t * 1.5) - 0.3 * cos(y * 5.0 - t);
    float w = 0.02 + 0.03 * noise5D(vec3(uv * 5.0, t * 0.3), t * 0.1, t * 0.07);
    return 1.0 - smoothstep(0.0, w, abs(crack));
  }

  void main() {
    vec2 uv = vUv;
    float t = time;

    // إحداثيات الأبعاد الإضافية
    float w4 = sin(uv.x * 6.28318 + t * 0.4) * dim5Depth;
    float v5 = cos(uv.y * 6.28318 - t * 0.3) * dim5Depth;

    // شق الفضاء الخماسي
    float rift = riftShape(uv, t);

    // ضوء ما وراء الشق (البُعد الخامس)
    float inner = noise5D(vec3(uv * 8.0, t * 0.5), w4, v5);
    float energy = noise5D(vec3(uv * 15.0 + t * 0.2, t * 0.3), w4 * 2.0, v5 * 1.5);

    // ألوان البُعد الخامس
    vec3 dim5Color = mix(
      vec3(0.886, 0.071, 0.153),
      mix(vec3(0.0, 0.898, 1.0), vec3(0.8, 0.0, 1.0), energy),
      inner
    );
    vec3 voidColor = vec3(0.0, 0.0, 0.05);

    // تشويه الفضاء حول الشق (Spacetime Distortion)
    float distortion = rift * riftIntensity;
    vec2 distUV = uv + vec2(
      sin(uv.y * 20.0 + t * 2.0) * distortion * 0.05,
      cos(uv.x * 20.0 - t * 1.5) * distortion * 0.03
    );

    // طبقات الجسور بين الأبعاد
    float bridge = noise5D(vec3(distUV * 12.0, t * 0.4), w4, v5);
    float sparkle = step(0.92, noise5D(vec3(uv * 30.0, t * 2.0), w4 * 3.0, v5 * 2.0));

    vec3 col = mix(voidColor, dim5Color, rift * (0.5 + inner * 0.5));
    col += dim5Color * sparkle * rift * 2.0;
    col += vec3(1.0, 0.9, 0.8) * bridge * rift * 0.3;

    float alpha = rift * riftIntensity * (0.7 + inner * 0.3) + sparkle * rift * 0.5;
    gl_FragColor = vec4(col, alpha);
  }
`;

// ── Quantum Foam 5D — رغوة كمومية عند مقياس بلانك ──────────────────────────
export const quantumFoamVertex5D = `
  uniform float time;
  uniform float foamScale;
  uniform float dim5Chaos;
  attribute float foamPhase;
  attribute vec3  foamColor;
  attribute float foamSize;
  varying vec3  vColor;
  varying float vFoam;

  // ضوضاء ثلاثية الأبعاد سريعة
  float qHash(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5);
  }

  // طوبولوجيا الرغوة الكمومية 5D
  vec3 foamWarp(vec3 p, float t, float chaos) {
    float f1 = qHash(p * foamScale + t * 0.3 + foamPhase);
    float f2 = qHash(p * foamScale * 2.1 - t * 0.2 + foamPhase * 1.7);
    float f3 = qHash(p * foamScale * 0.5 + t * 0.4 + foamPhase * 0.3);
    float w4 = qHash(p.xzy * foamScale + t * 0.15);
    float v5 = qHash(p.yzx * foamScale * 1.3 - t * 0.1);
    return p + vec3(
      (f1 - 0.5) * chaos * (1.0 + v5),
      (f2 - 0.5) * chaos * (1.0 + w4),
      (f3 - 0.5) * chaos
    );
  }

  void main() {
    float t = time;
    vec3 p = foamWarp(position, t, dim5Chaos * 0.4);
    vFoam  = qHash(position + t * 0.05 + foamPhase);
    vColor = mix(foamColor, vec3(1.0) - foamColor, vFoam * 0.3);
    float pulsate = 0.5 + 0.5 * sin(t * 4.0 + foamPhase * 20.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = foamSize * pulsate * (200.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`;

export const quantumFoamFragment5D = `
  varying vec3  vColor;
  varying float vFoam;
  void main() {
    vec2  uv = gl_PointCoord - 0.5;
    float d  = length(uv);
    if(d > 0.5) discard;
    float a = exp(-d * 10.0) * (0.3 + vFoam * 0.7);
    gl_FragColor = vec4(vColor, a);
  }
`;

// ── 5D Ray March — تتبع الأشعة خماسي الأبعاد ─────────────────────────────────
export const rayMarch5DVertex = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

export const rayMarch5DFragment = `
  uniform float time;
  uniform vec2  resolution;
  uniform vec3  cameraPos;
  uniform float dim4Angle;
  uniform float dim5Field;
  varying vec2 vUv;

  const float PI = 3.14159265;
  const int MAX_STEPS = 96;
  const float MAX_DIST = 18.0;
  const float SURF_DIST = 0.002;

  float hash(vec3 p) {
    p = fract(p * vec3(443.897, 441.423, 437.195));
    p += dot(p, p.yzx + 19.19);
    return fract((p.x + p.y) * p.z);
  }
  float noise(vec3 p) {
    vec3 i = floor(p), f = smoothstep(0.,1.,fract(p));
    return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }

  // دوران 4D
  mat2 rot2(float a){ return mat2(cos(a),-sin(a),sin(a),cos(a)); }

  // تشويه 4D للسطح
  vec3 warp4D(vec3 p, float t) {
    float w = sin(length(p) * 2.0 + t * 0.5) * dim4Angle;
    p.xy = rot2(w * 0.5 + t * 0.2) * p.xy;
    p.xz = rot2(w * 0.3 - t * 0.15) * p.xz;
    p.yz = rot2(w * 0.4 + t * 0.1) * p.yz;
    return p;
  }

  // تشويه البُعد الخامس: طوبولوجيا الوعي
  float consciousnessSDF(vec3 p, float t) {
    float v5 = sin(p.x * 3.0 + t * 0.7) * cos(p.y * 2.5 - t * 0.5) * sin(p.z * 2.0 + t * 0.6);
    return v5 * dim5Field * 0.25;
  }

  // SDF مشهد خماسي الأبعاد
  vec2 scene5D(vec3 p) {
    float t = time;
    vec3 p4 = warp4D(p, t);
    float c5 = consciousnessSDF(p, t);

    // كرة مشوهة بالبُعد الرابع
    float n = noise(p4 * 1.8 + t * 0.2) * 0.5;
    float core = length(p4) - 1.2 - n + c5;

    // حلقات توروس 4D
    vec3 tp1 = p4;
    tp1.xz = rot2(t * 0.6) * tp1.xz;
    tp1.xy = rot2(t * 0.35) * tp1.xy;
    vec2 q1 = vec2(length(tp1.xz) - 2.0, tp1.y);
    float ring1 = length(q1) - 0.06 + c5 * 0.5;

    vec3 tp2 = p4;
    tp2.yz = rot2(t * 0.45) * tp2.yz;
    tp2.xz = rot2(t * 0.25) * tp2.xz;
    vec2 q2 = vec2(length(tp2.xy) - 2.8, tp2.z);
    float ring2 = length(q2) - 0.045 + c5 * 0.3;

    // مكعب 4D (Hypercube shadow)
    vec3 bp = p4 - vec3(3.5, 0.0, 0.0);
    bp.xy = rot2(t * 0.5) * bp.xy;
    bp.xz = rot2(t * 0.3) * bp.xz;
    vec3 qb = abs(bp) - vec3(0.5 + abs(c5) * 0.2);
    float cube = length(max(qb,0.)) + min(max(qb.x,max(qb.y,qb.z)),0.);

    // كرة كمومية صغيرة (شقيقة المكعب في البُعد الخامس)
    vec3 sp2 = p4 + vec3(3.0, 0.0, 1.5);
    float sphere2 = length(sp2) - 0.6 - n * 0.5 - abs(c5) * 0.4;

    float scene = min(min(core, ring1), min(ring2, min(cube, sphere2)));
    float id = core < ring1 ? 0.0 :
               (ring1 < ring2 ? 1.0 :
               (cube < ring2 ? 3.0 :
               (sphere2 < ring2 ? 4.0 : 2.0)));
    return vec2(scene, id);
  }

  vec3 calcNormal5D(vec3 p) {
    vec2 e = vec2(0.0015, 0.0);
    return normalize(vec3(
      scene5D(p+e.xyy).x - scene5D(p-e.xyy).x,
      scene5D(p+e.yxy).x - scene5D(p-e.yxy).x,
      scene5D(p+e.yyx).x - scene5D(p-e.yyx).x
    ));
  }

  float softShadow5D(vec3 ro, vec3 rd, float mn, float mx, float k) {
    float res = 1.0, t = mn;
    for(int i=0;i<24;i++){
      float h = scene5D(ro + rd * t).x;
      if(h < 0.002) return 0.0;
      res = min(res, k * h / t);
      t += clamp(h, 0.02, 0.3);
      if(t > mx) break;
    }
    return clamp(res, 0.0, 1.0);
  }

  void main() {
    vec2 uv = (vUv - 0.5) * 2.0;
    uv.x *= resolution.x / resolution.y;
    float t = time;

    vec3 ro = cameraPos;
    vec3 ta = vec3(0.0);
    vec3 ww = normalize(ta - ro);
    vec3 uu = normalize(cross(ww, vec3(0,1,0)));
    vec3 vv = cross(uu, ww);
    vec3 rd = normalize(uv.x * uu + uv.y * vv + 1.5 * ww);

    float dist = 0.1;
    float id   = -1.0;
    bool  hit  = false;
    for(int i=0; i<MAX_STEPS; i++) {
      vec2 res = scene5D(ro + rd * dist);
      if(res.x < SURF_DIST){ hit = true; id = res.y; break; }
      if(dist > MAX_DIST) break;
      dist += res.x * 0.85;
    }

    vec3 col = vec3(0.0);

    if(hit) {
      vec3 pos = ro + rd * dist;
      vec3 nor = calcNormal5D(pos);
      float c5 = consciousnessSDF(pos, t);

      // ألوان المواد 5D
      vec3 matCol;
      float metalness = 0.5;
      if(id < 0.5) {
        // النواة: حمراء/برتقالية + تأثير الوعي
        matCol = mix(vec3(0.886, 0.071, 0.153), vec3(1.0, 0.5, 0.0),
                    noise(pos * 2.0 + t * 0.1) + c5 * 0.5);
        metalness = 0.4;
      } else if(id < 1.5) {
        // الحلقة 1: سيانية معدنية
        matCol = mix(vec3(0.0, 0.898, 1.0), vec3(0.0, 0.5, 1.0), abs(c5));
        metalness = 0.95;
      } else if(id < 2.5) {
        // الحلقة 2: بنفسجية
        matCol = vec3(0.55, 0.05, 1.0);
        metalness = 0.8;
      } else if(id < 3.5) {
        // مكعب 4D: ذهبي
        matCol = mix(vec3(1.0, 0.8, 0.0), vec3(1.0, 0.4, 0.0), noise(pos * 3.0));
        metalness = 0.9;
      } else {
        // كرة البُعد الخامس: وردية/فوشيا
        matCol = mix(vec3(1.0, 0.0, 0.8), vec3(0.0, 1.0, 0.8), abs(c5) + 0.5);
        metalness = 0.7;
      }

      vec3 L1 = normalize(vec3(2.5, 3.5, -1.0));
      vec3 L2 = normalize(vec3(-2.5, -1.5, 2.5));
      float d1 = max(dot(nor, L1), 0.0);
      float d2 = max(dot(nor, L2), 0.0) * 0.35;
      vec3 H1 = normalize(L1 - rd);
      float spec = pow(max(dot(nor, H1), 0.0), 80.0) * (0.3 + metalness * 0.7);
      float fresnel = pow(1.0 - max(dot(nor, -rd), 0.0), 3.5);
      float shadow = softShadow5D(pos + nor * 0.003, L1, 0.03, 10.0, 14.0);
      float ao = 0.5 + 0.5 * nor.y;

      // إضاءة البُعد الخامس (توهج الوعي)
      float dim5glow = abs(c5) * dim5Field * 2.0;
      vec3 dim5light = mix(vec3(0.0, 0.898, 1.0), vec3(1.0, 0.0, 0.8), abs(c5)) * dim5glow;

      col  = matCol * (d1 * shadow + d2) * ao;
      col += vec3(spec) * shadow;
      col += matCol * fresnel * 0.35;
      col += dim5light;

      // نبضة الوعي
      float pulse5 = sin(t * 2.5 + length(pos) * 4.0 + c5 * 10.0) * 0.5 + 0.5;
      col += matCol * pulse5 * 0.12;
    }

    // خلفية فضاء 5D
    if(!hit) {
      float bg = noise(rd * 2.0 + t * 0.04);
      float dim5bg = sin(rd.x * 5.0 + t * 0.3) * cos(rd.y * 4.0 + t * 0.2) * dim5Field;
      col = mix(vec3(0.02, 0.0, 0.06), vec3(0.0, 0.03, 0.1), rd.y * 0.5 + 0.5);
      col += vec3(0.886, 0.071, 0.153) * bg * 0.04;
      col += vec3(0.0, 0.898, 1.0) * abs(dim5bg) * 0.02;
    }

    // Vignette
    float vig = 1.0 - smoothstep(0.4, 1.4, length(vUv - 0.5) * 2.2);
    col *= vig;

    // ACES Tone Mapping
    col = (col * (2.51*col + 0.03)) / (col * (2.43*col + 0.59) + 0.14);
    col = pow(max(col, 0.0), vec3(1.0/2.2));

    gl_FragColor = vec4(col, 0.92);
  }
`;
