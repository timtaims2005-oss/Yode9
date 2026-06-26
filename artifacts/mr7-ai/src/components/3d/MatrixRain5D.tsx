/**
 * MatrixRain5D — مطر المصفوفة خماسي الأبعاد
 * كود يتساقط في 5 أبعاد: XYZ + طور زمني 4D + وعي كمومي 5D
 * حروف عربية + كاتاكانا + رموز كمومية + أبعاد خارج المنطق
 */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getQualityLevel } from "../../lib/adaptive-quality";

// رموز الأبعاد الخمسة
const CHARS_5D = "アイウエオカキクケコ01234567890101١٢٣٤٥٦٧٨٩ΨΩΛΣΦΞ▓▒░█◈◉⬡⬢★✦⚡∞∂∇∮⊕⊗⊙Ψ₅∈∉⊂⊃∪∩≡≠≤≥";

const matrixVert5D = `
  attribute float charIndex;
  attribute float colSpeed;
  attribute float colOffset;
  attribute float colX;
  attribute float colBright;
  attribute float w4;
  attribute float v5;
  varying   float vBright;
  varying   float vChar;
  varying   float vDim5;
  varying   vec3  vColor;
  uniform   float time;
  uniform   float pixelRatio;
  uniform   float charCount;

  void main(){
    vChar  = charIndex;
    vDim5  = v5;

    float t = mod(time * colSpeed + colOffset, 28.0);
    float y = 14.0 - t;

    // تأثير البُعد الرابع: انحراف أفقي زمني
    float w4drift = sin(time * colSpeed * 0.3 + w4 * 3.14159) * w4 * 0.4;

    // تأثير البُعد الخامس: تشويه عمودي كمومي
    float v5warp  = cos(time * colSpeed * 0.2 + v5 * 6.28318) * abs(v5) * 0.3;

    // سطوع الرأس مع البُعد الرابع
    float headDist = abs(y - position.y + v5warp);
    vBright = exp(-headDist * 0.5) * colBright;
    if(headDist < 0.5) vBright = 1.3;

    // لون يتغير مع البُعد الخامس
    float t5 = v5 * 0.5 + 0.5;
    vColor = mix(
      vec3(0.0, 0.898, 0.22),       // أخضر Matrix كلاسيكي
      mix(vec3(0.886, 0.071, 0.153), // أحمر كمومي
          vec3(0.0, 0.7, 1.0), t5),  // أزرق كمومي
      abs(v5) * 0.8
    );

    vec3 pos = vec3(colX + w4drift, y - mod(position.y, 28.0) + v5warp, position.z);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (14.0 + abs(v5) * 4.0) * pixelRatio * (200.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`;

const matrixFrag5D = `
  varying float vBright;
  varying float vChar;
  varying float vDim5;
  varying vec3  vColor;

  void main(){
    if(vBright < 0.015) discard;
    vec2 uv = gl_PointCoord;
    float d = length(uv - 0.5);
    if(d > 0.5) discard;

    // محاكاة حرف مع تأثير البُعد الخامس
    float charSim = step(0.3, fract(uv.x * 3.0)) * step(0.1, uv.y) * step(uv.y, 0.9);

    // توهج كمومي عند السطوع العالي (رأس العمود)
    float isHead = step(1.05, vBright);
    vec3  headCol = vec3(0.95, 1.0, 0.95) + vColor * 0.3;
    vec3  col = mix(vColor, headCol, isHead);

    // حلقة كمومية حول البيكسل في البُعد الخامس
    float ring5 = exp(-abs(d - 0.38) * 20.0) * abs(vDim5) * 0.8;

    float a = (charSim * 0.65 + 0.35 + ring5) * min(vBright, 1.2);
    gl_FragColor = vec4(col, a * 0.82);
  }
`;

export function MatrixRain5D({
  columns = 35,
  rows    = 30,
}: {
  columns?: number;
  rows?:    number;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const data = useMemo(() => {
    const count   = columns * rows;
    const pos     = new Float32Array(count * 3);
    const chars   = new Float32Array(count);
    const speeds  = new Float32Array(count);
    const offsets = new Float32Array(count);
    const colXs   = new Float32Array(count);
    const bright  = new Float32Array(count);
    const w4Arr   = new Float32Array(count);
    const v5Arr   = new Float32Array(count);

    for (let c = 0; c < columns; c++) {
      const x      = (c / columns - 0.5) * 20;
      const speed  = 0.4 + Math.random() * 1.8;
      const offset = Math.random() * 28;
      const b      = 0.4 + Math.random() * 0.6;
      const w4col  = Math.random() * 2 - 1;   // إحداثية البُعد الرابع للعمود
      const v5col  = Math.random() * 2 - 1;   // إحداثية البُعد الخامس للعمود

      for (let r = 0; r < rows; r++) {
        const idx       = c * rows + r;
        pos[idx*3]      = x;
        pos[idx*3+1]    = (r / rows) * 28 - 14;
        pos[idx*3+2]    = -3 - Math.random() * 4;
        chars[idx]      = Math.floor(Math.random() * CHARS_5D.length);
        speeds[idx]     = speed;
        offsets[idx]    = offset;
        colXs[idx]      = x;
        bright[idx]     = b;
        w4Arr[idx]      = w4col * (0.5 + Math.random() * 0.5);
        v5Arr[idx]      = v5col * (0.5 + Math.random() * 0.5);
      }
    }
    return { pos, chars, speeds, offsets, colXs, bright, w4Arr, v5Arr };
  }, [columns, rows]);

  const uniforms = useMemo(() => ({
    time:       { value: 0 },
    pixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    charCount:  { value: CHARS_5D.length },
  }), []);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value = state.clock.elapsedTime;
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position"  args={[data.pos,     3]} />
        <bufferAttribute attach="attributes-charIndex" args={[data.chars,   1]} />
        <bufferAttribute attach="attributes-colSpeed"  args={[data.speeds,  1]} />
        <bufferAttribute attach="attributes-colOffset" args={[data.offsets, 1]} />
        <bufferAttribute attach="attributes-colX"      args={[data.colXs,   1]} />
        <bufferAttribute attach="attributes-colBright" args={[data.bright,  1]} />
        <bufferAttribute attach="attributes-w4"        args={[data.w4Arr,   1]} />
        <bufferAttribute attach="attributes-v5"        args={[data.v5Arr,   1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={matrixVert5D}
        fragmentShader={matrixFrag5D}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default MatrixRain5D;
