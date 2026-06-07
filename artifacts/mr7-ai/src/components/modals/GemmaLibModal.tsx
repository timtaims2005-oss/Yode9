import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FlaskConical, Cpu, Zap, BookOpen, Code2, Layers, Play, ChevronRight } from "lucide-react";
import { streamChat } from "@/lib/chat-client";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const GEMMA_VERSIONS = [
  { id: "gemma4", label: "Gemma 4", model: "E4B IT", color: "#4285f4", desc: "Latest multimodal Gemma with tool use, multi-turn conversation, and vision." },
  { id: "gemma3", label: "Gemma 3", model: "27B IT", color: "#34a853", desc: "Powerful instruction-tuned model with strong code and reasoning capabilities." },
  { id: "gemma2", label: "Gemma 2", model: "9B / 27B", color: "#fbbc04", desc: "Efficient architecture with knowledge distillation for smaller sizes." },
  { id: "gemma1", label: "Gemma 1", model: "2B / 7B", color: "#ea4335", desc: "Lightweight open-weights model for edge deployment and fine-tuning." },
];

const COLABS = [
  { id: "sampling", label: "Sampling", icon: Zap, desc: "Basic text generation with temperature, top-k, top-p sampling" },
  { id: "finetuning", label: "Fine-Tuning", icon: FlaskConical, desc: "Full fine-tuning on custom datasets with JAX/Flax" },
  { id: "lora", label: "LoRA", icon: Layers, desc: "Low-rank adaptation for parameter-efficient fine-tuning" },
  { id: "multimodal", label: "Multimodal", icon: Cpu, desc: "Image + text understanding with Gemma 4 vision" },
  { id: "quantization", label: "Quantization", icon: Code2, desc: "INT8/INT4 quantization-aware training for edge deployment" },
  { id: "tooluse", label: "Tool Use", icon: BookOpen, desc: "Function calling and structured outputs with Gemma 4" },
];

export function GemmaLibModal({ open, onOpenChange }: Props) {
  const [selectedVersion, setSelectedVersion] = useState("gemma4");
  const [selectedColab, setSelectedColab] = useState("sampling");
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [streaming, setStreaming] = useState(false);

  const version = GEMMA_VERSIONS.find(v => v.id === selectedVersion)!;
  const colab = COLABS.find(c => c.id === selectedColab)!;

  const runQuery = async () => {
    if (!query.trim() || streaming) return;
    setStreaming(true);
    setResponse("");
    try {
      const systemPrompt = `You are an expert on Google DeepMind's Gemma open-weights LLM family. The user is working with ${version.label} (${version.model}) and the "${colab.label}" workflow (${colab.desc}).

Provide accurate, detailed technical guidance. Include JAX/Python code examples when relevant. Reference the gemma PyPI package and its ChatSampler API. Be precise about model checkpoint paths, LoRA configs, quantization strategies, and hardware requirements.`;
      await streamChat({ model: "gpt-5.4", persona: null, customInstructions: "", language: "en", memory: [], messages: [{ role: "user", content: query }], customSystemPrompt: systemPrompt }, (chunk) => { setResponse(p => p + chunk); }, undefined);
    } catch {
      setResponse("Error connecting to AI. Please add your OPENAI_API_KEY in Secrets.");
    } finally {
      setStreaming(false);
    }
  };

  const CODE_EXAMPLE = selectedVersion === "gemma4"
    ? `from gemma import gm\n\nmodel = gm.nn.Gemma4_E4B()\nparams = gm.ckpts.load_params(\n    gm.ckpts.CheckpointPath.GEMMA4_E4B_IT\n)\n\nsampler = gm.text.ChatSampler(\n    model=model,\n    params=params,\n    multi_turn=True,\n)\n\n# Multi-turn, multi-modal\nout = sampler.chat(\n    "Describe this image: <|image|>",\n    images=[my_image]\n)`
    : selectedVersion === "lora"
    ? `from gemma import gm\n\n# LoRA config\nlora_cfg = gm.training.LoraConfig(\n    rank=16, alpha=32,\n    target_modules=["q_proj", "v_proj"]\n)\n\n# Fine-tune with LoRA\ntrainer = gm.training.Trainer(\n    model=gm.nn.Gemma3_27B(),\n    lora_config=lora_cfg,\n    learning_rate=1e-4,\n)`
    : `from gemma import gm\n\n# Load Gemma ${version.label}\nmodel = gm.nn.${version.id === "gemma2" ? "Gemma2_9B" : "Gemma_7B"}()\nparams = gm.ckpts.load_params(\n    gm.ckpts.CheckpointPath.${version.id.toUpperCase()}_9B_IT\n)\n\nsampler = gm.text.ChatSampler(\n    model=model, params=params\n)\nout = sampler.chat("Hello Gemma!")`;

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
          onClick={e => e.target === e.currentTarget && onOpenChange(false)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-4xl rounded-2xl border overflow-hidden flex flex-col"
            style={{ background: "#080808", borderColor: "rgba(66,133,244,0.25)", maxHeight: "90vh" }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(66,133,244,0.15)", background: "linear-gradient(135deg,#04080f,#080808)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(66,133,244,0.15)", border: "1px solid rgba(66,133,244,0.3)" }}>
                  <FlaskConical className="w-4 h-4" style={{ color: "#4285f4" }} />
                </div>
                <div>
                  <div className="text-sm font-bold" style={{ color: "#4285f4" }}>Gemma Library</div>
                  <div className="text-[10px] font-mono" style={{ color: "#555" }}>Google DeepMind · JAX LLM Framework</div>
                </div>
              </div>
              <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                <X className="w-4 h-4" style={{ color: "#444" }} />
              </button>
            </div>

            <div className="flex flex-1 min-h-0">
              {/* Left Panel */}
              <div className="w-52 border-r flex flex-col" style={{ borderColor: "rgba(255,255,255,0.05)", background: "#060606" }}>
                <div className="p-3 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  <div className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "#333" }}>Model Version</div>
                  {GEMMA_VERSIONS.map(v => (
                    <button key={v.id} onClick={() => setSelectedVersion(v.id)}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[10px] font-bold mb-1 transition-all"
                      style={{ background: selectedVersion === v.id ? `${v.color}15` : "transparent", color: selectedVersion === v.id ? v.color : "#444", border: `1px solid ${selectedVersion === v.id ? `${v.color}30` : "transparent"}` }}>
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: v.color }} />
                      {v.label}
                    </button>
                  ))}
                </div>
                <div className="p-3 flex-1">
                  <div className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "#333" }}>Colab / Tutorial</div>
                  {COLABS.map(c => {
                    const Icon = c.icon;
                    return (
                      <button key={c.id} onClick={() => setSelectedColab(c.id)}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[10px] font-bold mb-1 transition-all"
                        style={{ background: selectedColab === c.id ? "rgba(66,133,244,0.1)" : "transparent", color: selectedColab === c.id ? "#4285f4" : "#444" }}>
                        <Icon className="w-3 h-3 flex-shrink-0" />{c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Panel */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Version Info */}
                <div className="px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-bold" style={{ color: version.color }}>{version.label}</div>
                    <div className="text-[9px] px-2 py-0.5 rounded font-mono" style={{ background: `${version.color}15`, color: version.color }}>{version.model}</div>
                  </div>
                  <p className="text-[10px] font-mono mt-1" style={{ color: "#444" }}>{version.desc}</p>
                  <p className="text-[9px] font-mono mt-1" style={{ color: "#2a2a2a" }}>Colab: {colab.label} — {colab.desc}</p>
                </div>

                {/* Code Preview */}
                <div className="px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  <div className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "#333" }}>Quick Start</div>
                  <pre className="text-[10px] font-mono p-3 rounded-lg overflow-x-auto" style={{ background: "rgba(0,0,0,0.5)", color: "#7dd3fc", lineHeight: 1.6 }}>{CODE_EXAMPLE}</pre>
                </div>

                {/* AI Chat */}
                <div className="flex-1 flex flex-col min-h-0 p-5">
                  <div className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "#333" }}>Ask AI about Gemma</div>
                  {response && (
                    <div className="flex-1 overflow-y-auto rounded-lg p-3 mb-3 text-[11px] font-mono leading-relaxed" style={{ background: "rgba(0,0,0,0.4)", color: "#aaa", whiteSpace: "pre-wrap", minHeight: "80px", maxHeight: "200px" }}>
                      {response}
                      {streaming && <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-blue-400 animate-pulse" />}
                    </div>
                  )}
                  <div className="flex gap-2 mt-auto">
                    <input value={query} onChange={e => setQuery(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && runQuery()}
                      placeholder={`Ask about ${version.label} ${colab.label}...`}
                      className="flex-1 px-3 py-2 rounded-lg text-[11px] font-mono border outline-none"
                      style={{ background: "#0a0a0a", borderColor: "rgba(66,133,244,0.2)", color: "#ddd" }} />
                    <button onClick={runQuery} disabled={!query.trim() || streaming}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold transition-all"
                      style={{ background: query.trim() && !streaming ? "rgba(66,133,244,0.2)" : "rgba(255,255,255,0.05)", color: query.trim() && !streaming ? "#4285f4" : "#333", border: `1px solid ${query.trim() && !streaming ? "rgba(66,133,244,0.4)" : "rgba(255,255,255,0.08)"}` }}>
                      <Play className="w-3 h-3" />Run
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.05)", background: "#060606" }}>
              <div className="text-[9px] font-mono" style={{ color: "#222" }}>pip install gemma · JAX · Google DeepMind</div>
              <FlaskConical className="w-3.5 h-3.5" style={{ color: "#1a1a1a" }} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
