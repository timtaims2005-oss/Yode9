/**
 * React hook — يتيح لأي component قراءة PerfMode/WorkflowMode reactively
 */
import { useState, useEffect } from "react";
import { operationModeEngine, type PerfMode, type WorkflowMode } from "../lib/operation-mode-engine";

export function useOperationMode() {
  const [perf,  setPerf]  = useState<PerfMode>(operationModeEngine.currentPerf);
  const [wflow, setWflow] = useState<WorkflowMode>(operationModeEngine.currentWorkflow);

  useEffect(() => {
    const unsubscribe = operationModeEngine.onChange((p, w) => {
      setPerf(p);
      setWflow(w);
    });
    return () => { unsubscribe(); };
  }, []);

  return {
    perfMode:       perf,
    workflowMode:   wflow,
    profile:        operationModeEngine.currentProfile,
    systemPrompt:   operationModeEngine.currentSystemPrompt,
    isLowPower:     perf === "low",
    isMaxPower:     perf === "xhigh",
    showParticles:  operationModeEngine.currentProfile.particles,
    showWebGL:      operationModeEngine.currentProfile.webgl,
  };
}
