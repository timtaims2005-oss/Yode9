import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface StatusItem {
  id: string;
  label: string;
  value: string;
  color: string;
  icon: string;
  animated?: boolean;
}

export function QuantumStatusBar() {
  const [items, setItems] = useState<StatusItem[]>([
    { id:"threats", label:"THREATS",  value:"847",    color:"#e21227", icon:"◈", animated:true },
    { id:"blocked", label:"BLOCKED",  value:"1,293",  color:"#10b981", icon:"◉" },
    { id:"ai",      label:"AI OPS",   value:"94.8K",  color:"#00e5ff", icon:"⬡", animated:true },
    { id:"nodes",   label:"NODES",    value:"247",    color:"#a78bfa", icon:"▣" },
    { id:"latency", label:"LATENCY",  value:"12ms",   color:"#f59e0b", icon:"▲" },
    { id:"uptime",  label:"UPTIME",   value:"99.97%", color:"#10b981", icon:"◆" },
    { id:"dim",     label:"4D ENGINE",value:"ACTIVE", color:"#ff7800", icon:"⬟", animated:true },
  ]);

  const tickRef = useRef(0);

  useEffect(() => {
    const iv = setInterval(() => {
      tickRef.current++;
      setItems(prev => prev.map(item => {
        switch (item.id) {
          case "threats":
            return { ...item, value: (800 + Math.floor(Math.random() * 100)).toString() };
          case "blocked":
            return { ...item, value: (1200 + Math.floor(Math.random() * 200)).toLocaleString() };
          case "ai":
            return { ...item, value: `${(90 + Math.random() * 20).toFixed(1)}K` };
          case "nodes":
            return { ...item, value: (240 + Math.floor(Math.random() * 15)).toString() };
          case "latency":
            return { ...item, value: `${8 + Math.floor(Math.random() * 10)}ms` };
          default:
            return item;
        }
      }));
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="flex items-center gap-3 px-2 py-1 overflow-x-auto"
      style={{ scrollbarWidth: "none" }}>
      {items.map((item, i) => (
        <motion.div key={item.id}
          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px]"
            style={{
              color: item.color,
              filter: item.animated ? `drop-shadow(0 0 4px ${item.color})` : "none",
              animation: item.animated ? "pulse 2s infinite" : "none",
            }}>
            {item.icon}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-[11px] font-bold font-mono" style={{ color: item.color }}>
              {item.value}
            </span>
            <span className="text-[9px] text-gray-600 font-mono">{item.label}</span>
          </div>
          {i < items.length - 1 && (
            <div className="w-px h-3 bg-white/10 ml-1" />
          )}
        </motion.div>
      ))}
    </div>
  );
}
