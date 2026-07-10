/**
 * VR Support — WebXR API
 * دعم الواقع الافتراضي عبر WebXR لخوذات Meta Quest وما شابه
 */
import { useRef, useEffect, useState } from "react";

interface VRStatus {
  supported: boolean;
  active: boolean;
  headsetName: string;
}

export function useVRSupport() {
  const [status, setStatus] = useState<VRStatus>({
    supported: false,
    active: false,
    headsetName: "",
  });

  useEffect(() => {
    if (!("xr" in navigator)) return;
    (navigator as any).xr?.isSessionSupported("immersive-vr").then((supported: boolean) => {
      setStatus(s => ({ ...s, supported }));
    }).catch(() => {});
  }, []);

  const enterVR = async (canvas: HTMLCanvasElement) => {
    if (!status.supported) return;
    try {
      const xr = (navigator as any).xr;
      const session = await xr.requestSession("immersive-vr", {
        requiredFeatures: ["local-floor"],
        optionalFeatures: ["bounded-floor", "hand-tracking"],
      });
      setStatus(s => ({ ...s, active: true }));
      session.addEventListener("end", () => {
        setStatus(s => ({ ...s, active: false }));
      });
    } catch (e) {
      console.warn("[VR] Could not start session:", e);
    }
  };

  return { status, enterVR };
}

export function VRButton({ canvasRef }: { canvasRef?: React.RefObject<HTMLCanvasElement | null> }) {
  const { status, enterVR } = useVRSupport();

  if (!status.supported) return null;

  return (
    <button
      onClick={() => canvasRef?.current && enterVR(canvasRef.current)}
      className="fixed bottom-6 right-6 z-50 px-4 py-2 rounded-lg text-xs font-mono font-bold
                 border border-cyan-500/50 bg-black/80 text-cyan-400 hover:bg-cyan-500/20
                 transition-all duration-200 backdrop-blur-sm"
      title="Enter Virtual Reality"
    >
      {status.active ? "🥽 EXIT VR" : "🥽 ENTER VR"}
    </button>
  );
}

// ── Spatial Audio ──────────────────────────────────────────────────────────
export function useSpatialAudio() {
  const ctxRef = useRef<AudioContext | null>(null);

  const init = () => {
    if (ctxRef.current) return ctxRef.current;
    ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return ctxRef.current;
  };

  const playPositional = (
    frequency: number,
    x: number,
    y: number,
    z: number,
    duration = 0.2
  ) => {
    try {
      const ctx = init();
      const osc    = ctx.createOscillator();
      const gain   = ctx.createGain();
      const panner = ctx.createPanner();

      panner.setPosition(x, y, z);
      panner.panningModel    = "HRTF";
      panner.distanceModel   = "inverse";
      panner.refDistance     = 1;
      panner.maxDistance     = 20;
      panner.rolloffFactor   = 1;

      osc.connect(gain);
      gain.connect(panner);
      panner.connect(ctx.destination);

      osc.frequency.value  = frequency;
      osc.type             = "sine";
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  };

  const playAmbient = () => {
    try {
      const ctx = init();
      const bufferSize = ctx.sampleRate * 2;
      const buffer     = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.01;
        }
      }
      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain   = ctx.createGain();
      source.buffer = buffer;
      source.loop   = true;
      filter.type   = "lowpass";
      filter.frequency.value = 200;
      gain.gain.value = 0.03;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      return () => source.stop();
    } catch {
      return () => {};
    }
  };

  return { playPositional, playAmbient };
}
