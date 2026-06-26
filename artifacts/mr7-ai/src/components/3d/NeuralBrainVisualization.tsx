/**
 * Neural Brain Visualization — مخ رقمي ثلاثي الأبعاد
 * خريطة عصبية فوتوريالية مع إشارات كهربائية حية
 */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getQualityLevel } from "../../lib/adaptive-quality";

// ── Synaptic Pulse (نبضة متشعبة) ─────────────────────────────────────────
const synapseVert = `
  attribute float progress;
  attribute float pSpeed;
  attribute vec3  pColor;
  varying   float vProgress;
  varying   vec3  vColor;
  uniform   float time;
  uniform   float pixelRatio;

  void main() {
    vProgress = progress;
    vColor    = pColor;

    vec3 pos  = position;
    float t   = mod(time * pSpeed + progress, 1.0);
    float alpha = sin(t * 3.14159);

    vec4 mv   = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 3.0 * pixelRatio * alpha * (200.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`;

const synapseFrag = `
  varying float vProgress;
  varying vec3  vColor;
  void main() {
    vec2  uv = gl_PointCoord - 0.5;
    float d  = length(uv);
    if(d > 0.5) discard;
    float a  = exp(-d * 6.0) * (1.0 - vProgress * 0.5);
    gl_FragColor = vec4(vColor, a * 0.9);
  }
`;

// ── Neuron Node ───────────────────────────────────────────────────────────
const neuronVert = `
  attribute float nodeSize;
  attribute float activation;
  attribute vec3  nodeColor;
  varying   float vActivation;
  varying   vec3  vColor;
  uniform   float time;
  uniform   float pixelRatio;

  void main() {
    vActivation = activation;
    vColor      = nodeColor;
    float pulse = 0.8 + 0.2 * sin(time * activation * 3.0 + position.x);
    vec4 mv     = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = nodeSize * pixelRatio * pulse * (400.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`;

const neuronFrag = `
  varying float vActivation;
  varying vec3  vColor;
  void main() {
    vec2  uv   = gl_PointCoord - 0.5;
    float d    = length(uv);
    if(d > 0.5) discard;
    float core = exp(-d * 10.0);
    float glow = exp(-d * 3.0) * 0.4;
    float ring = exp(-abs(d - 0.4) * 20.0) * vActivation * 0.5;
    float a    = (core + glow + ring);
    gl_FragColor = vec4(vColor, a);
  }
`;

// ── Axon Connection Line ──────────────────────────────────────────────────
const axonVert = `
  attribute float axonAlpha;
  varying   float vAlpha;
  uniform   float time;
  void main() {
    vAlpha = axonAlpha * (0.3 + 0.7 * sin(time * 1.5 + axonAlpha * 10.0));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const axonFrag = `
  varying float vAlpha;
  uniform vec3  color;
  void main() { gl_FragColor = vec4(color, vAlpha * 0.35); }
`;

export function NeuralBrain({ layerSizes = [8, 16, 24, 16, 8] }: {
  layerSizes?: number[];
}) {
  const groupRef = useRef<THREE.Group>(null);
  const synMatRef = useRef<THREE.ShaderMaterial>(null);
  const neuMatRef = useRef<THREE.ShaderMaterial>(null);
  const axMatRef  = useRef<THREE.ShaderMaterial>(null);

  const { nodes, axons, synapses } = useMemo(() => {
    const nodePos: number[] = [];
    const nodeSizes: number[] = [];
    const nodeActivations: number[] = [];
    const nodeColors: number[] = [];
    const layerNodeRanges: [number, number][] = [];

    // Build nodes per layer
    layerSizes.forEach((count, li) => {
      const x = (li / (layerSizes.length - 1) - 0.5) * 6;
      const start = nodePos.length / 3;
      for (let j = 0; j < count; j++) {
        const y = (j / (count - 1) - 0.5) * 4;
        const z = (Math.random() - 0.5) * 1.5;
        nodePos.push(x, y, z);
        nodeSizes.push(3 + Math.random() * 4);
        nodeActivations.push(0.3 + Math.random() * 0.7);
        const t = j / count;
        nodeColors.push(0.886 * (1-t), 0.071 * (1-t) + 0.898 * t, 0.153 * (1-t) + 1.0 * t);
      }
      layerNodeRanges.push([start, nodePos.length / 3]);
    });

    // Build axon connections between layers
    const axonPos: number[] = [];
    const axonAlphas: number[] = [];
    for (let li = 0; li < layerNodeRanges.length - 1; li++) {
      const [as, ae] = layerNodeRanges[li];
      const [bs, be] = layerNodeRanges[li + 1];
      for (let a = as; a < ae; a++) {
        // Connect to ~3 random next-layer nodes
        const connections = Math.min(3, be - bs);
        for (let c = 0; c < connections; c++) {
          const b = bs + Math.floor(Math.random() * (be - bs));
          axonPos.push(
            nodePos[a*3], nodePos[a*3+1], nodePos[a*3+2],
            nodePos[b*3], nodePos[b*3+1], nodePos[b*3+2],
          );
          const alpha = 0.2 + Math.random() * 0.8;
          axonAlphas.push(alpha, alpha);
        }
      }
    }

    // Synaptic pulse particles (travel along axons)
    const synPos: number[] = [];
    const synProgress: number[] = [];
    const synSpeeds: number[] = [];
    const synColors: number[] = [];
    const pulseCount = Math.min(axonPos.length / 6, 200) * 3;
    for (let i = 0; i < pulseCount; i++) {
      const axIdx = Math.floor(Math.random() * (axonPos.length / 6)) * 6;
      const t = Math.random();
      synPos.push(
        axonPos[axIdx]   + (axonPos[axIdx+3] - axonPos[axIdx])   * t,
        axonPos[axIdx+1] + (axonPos[axIdx+4] - axonPos[axIdx+1]) * t,
        axonPos[axIdx+2] + (axonPos[axIdx+5] - axonPos[axIdx+2]) * t,
      );
      synProgress.push(t);
      synSpeeds.push(0.2 + Math.random() * 0.6);
      const s = Math.random();
      synColors.push(0.886*(1-s), 0.898*s, 1.0*s + 0.153*(1-s));
    }

    return {
      nodes: {
        pos: new Float32Array(nodePos),
        sizes: new Float32Array(nodeSizes),
        activations: new Float32Array(nodeActivations),
        colors: new Float32Array(nodeColors),
      },
      axons: {
        pos: new Float32Array(axonPos),
        alphas: new Float32Array(axonAlphas),
      },
      synapses: {
        pos: new Float32Array(synPos),
        progress: new Float32Array(synProgress),
        speeds: new Float32Array(synSpeeds),
        colors: new Float32Array(synColors),
      },
    };
  }, [layerSizes]);

  const synUniforms = useMemo(() => ({ time: { value: 0 }, pixelRatio: { value: Math.min(window.devicePixelRatio, 2) } }), []);
  const neuUniforms = useMemo(() => ({ time: { value: 0 }, pixelRatio: { value: Math.min(window.devicePixelRatio, 2) } }), []);
  const axUniforms  = useMemo(() => ({ time: { value: 0 }, color: { value: new THREE.Color("#00e5ff") } }), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (synMatRef.current) synMatRef.current.uniforms.time.value = t;
    if (neuMatRef.current) neuMatRef.current.uniforms.time.value = t;
    if (axMatRef.current)  axMatRef.current.uniforms.time.value  = t;
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.1) * 0.3;
      groupRef.current.rotation.x = Math.cos(t * 0.08) * 0.15;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, -4]} scale={0.7}>
      {/* Axon connections */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position"  args={[axons.pos,    3]} />
          <bufferAttribute attach="attributes-axonAlpha" args={[axons.alphas, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={axMatRef}
          vertexShader={axonVert}
          fragmentShader={axonFrag}
          uniforms={axUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      {/* Neuron nodes */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position"   args={[nodes.pos,         3]} />
          <bufferAttribute attach="attributes-nodeSize"   args={[nodes.sizes,        1]} />
          <bufferAttribute attach="attributes-activation" args={[nodes.activations,  1]} />
          <bufferAttribute attach="attributes-nodeColor"  args={[nodes.colors,       3]} />
        </bufferGeometry>
        <shaderMaterial
          ref={neuMatRef}
          vertexShader={neuronVert}
          fragmentShader={neuronFrag}
          uniforms={neuUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Synaptic pulses */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[synapses.pos,      3]} />
          <bufferAttribute attach="attributes-progress" args={[synapses.progress, 1]} />
          <bufferAttribute attach="attributes-pSpeed"   args={[synapses.speeds,   1]} />
          <bufferAttribute attach="attributes-pColor"   args={[synapses.colors,   3]} />
        </bufferGeometry>
        <shaderMaterial
          ref={synMatRef}
          vertexShader={synapseVert}
          fragmentShader={synapseFrag}
          uniforms={synUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
