/**
 * Matrix Rain 3D — مطر المصفوفة ثلاثي الأبعاد
 * كود ثلاثي الأبعاد يتساقط مع حروف عربية وعالمية
 */
import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { getQualityLevel } from "../../lib/adaptive-quality";

// Characters: katakana + arabic numerals + latin + cyber symbols
const CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノ01234567890101١٢٣٤٥٦٧٨٩ABCDEFGHIJKLMNOP▓▒░█▌▐◈◉◆◇⬡⬢⬣★☆✦✧⚡";

const matrixVert = `
  attribute float charIndex;
  attribute float colSpeed;
  attribute float colOffset;
  attribute float colX;
  attribute float colBright;
  varying   float vBright;
  varying   float vChar;
  uniform   float time;
  uniform   float pixelRatio;
  uniform   float charCount;

  void main(){
    vChar   = charIndex;
    float t = mod(time * colSpeed + colOffset, 24.0);
    float y = 12.0 - t;

    // Head of column is brightest
    float headDist = abs(y - position.y);
    vBright = exp(-headDist * 0.6) * colBright;

    // Leading character is white-hot
    if(headDist < 0.5) vBright = 1.2;

    vec3 pos = vec3(colX, y - mod(position.y, 24.0), position.z);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 14.0 * pixelRatio * (200.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`;

const matrixFrag = `
  varying float vBright;
  varying float vChar;
  uniform sampler2D charAtlas;
  uniform float     charCount;

  void main(){
    if(vBright < 0.02) discard;
    // Use point coord as character display (no atlas needed — just color)
    vec2 uv = gl_PointCoord;
    float d = length(uv - 0.5);
    if(d > 0.5) discard;

    // Simulate character shape with vertical lines
    float charSim = step(0.3, fract(uv.x * 3.0)) * step(0.1, uv.y) * step(uv.y, 0.9);

    float isHead = step(1.0, vBright);
    vec3  headCol = vec3(0.95, 1.0, 0.95);
    vec3  bodyCol = vec3(0.0, 0.898, 0.22);
    vec3  col = mix(bodyCol, headCol, isHead);

    float a = (charSim * 0.7 + 0.3) * min(vBright, 1.0);
    gl_FragColor = vec4(col, a * 0.85);
  }
`;

export function MatrixRain3D({ columns = 30, rows = 25 }: {
  columns?: number;
  rows?: number;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const data = useMemo(() => {
    const count = columns * rows;
    const pos     = new Float32Array(count * 3);
    const chars   = new Float32Array(count);
    const speeds  = new Float32Array(count);
    const offsets = new Float32Array(count);
    const colXs   = new Float32Array(count);
    const bright  = new Float32Array(count);

    for (let c = 0; c < columns; c++) {
      const x     = (c / columns - 0.5) * 16;
      const speed = 0.5 + Math.random() * 1.5;
      const offset= Math.random() * 24;
      const b     = 0.4 + Math.random() * 0.6;

      for (let r = 0; r < rows; r++) {
        const idx = c * rows + r;
        pos[idx*3]   = x;
        pos[idx*3+1] = (r / rows) * 24 - 12;
        pos[idx*3+2] = -3 - Math.random() * 2;
        chars[idx]   = Math.random() * CHARS.length;
        speeds[idx]  = speed;
        offsets[idx] = offset;
        colXs[idx]   = x;
        bright[idx]  = b;
      }
    }
    return { pos, chars, speeds, offsets, colXs, bright };
  }, [columns, rows]);

  const uniforms = useMemo(() => ({
    time:       { value: 0 },
    pixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    charCount:  { value: CHARS.length },
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
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={matrixVert}
        fragmentShader={matrixFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
