import { useState, useEffect } from "react";

interface SystemHealthMatrixProps {
  metrics?: {
    cpu?: number;
    memory?: number;
    disk?: number;
    network?: number;
  };
}

function HealthCell({ label, value, threshold = 80 }: { label: string; value: number; threshold?: number }) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const color = value > threshold ? "#e21227" : value > threshold * 0.7 ? "#f59e0b" : "#00e5ff";

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimatedValue((prev) => {
        const diff = value - prev;
        if (Math.abs(diff) < 0.5) return value;
        return prev + diff * 0.1;
      });
    }, 50);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className="flex flex-col items-center p-3 bg-black/60 rounded border border-white/10">
      <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">{label}</div>
      <div className="relative w-16 h-16">
        <svg className="w-full h-full -rotate-90">
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="#1a1a1a"
            strokeWidth="4"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeDasharray={`${(animatedValue / 100) * 175.9} 175.9`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.5s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-mono font-bold" style={{ color }}>
            {Math.round(animatedValue)}
          </span>
        </div>
      </div>
      <div className="text-xs text-gray-400 mt-1">%</div>
    </div>
  );
}

export function SystemHealthMatrix({ metrics = {} }: SystemHealthMatrixProps) {
  const [localMetrics, setLocalMetrics] = useState({
    cpu: 0,
    memory: 0,
    disk: 0,
    network: 0,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setLocalMetrics((prev) => ({
        cpu: prev.cpu + (Math.random() - 0.5) * 10,
        memory: prev.memory + (Math.random() - 0.5) * 5,
        disk: prev.disk + (Math.random() - 0.5) * 2,
        network: prev.network + (Math.random() - 0.5) * 15,
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const finalMetrics = {
    cpu: Math.max(0, Math.min(100, metrics.cpu ?? localMetrics.cpu)),
    memory: Math.max(0, Math.min(100, metrics.memory ?? localMetrics.memory)),
    disk: Math.max(0, Math.min(100, metrics.disk ?? localMetrics.disk)),
    network: Math.max(0, Math.min(100, metrics.network ?? localMetrics.network)),
  };

  return (
    <div className="grid grid-cols-2 gap-2 p-2 bg-black/40 backdrop-blur-sm rounded-lg border border-white/10">
      <HealthCell label="CPU" value={finalMetrics.cpu} />
      <HealthCell label="MEM" value={finalMetrics.memory} />
      <HealthCell label="DISK" value={finalMetrics.disk} />
      <HealthCell label="NET" value={finalMetrics.network} />
    </div>
  );
}
