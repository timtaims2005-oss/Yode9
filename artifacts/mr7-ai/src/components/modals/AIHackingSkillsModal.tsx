import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Brain, Shield, Zap, Bug, Play, BookOpen, Terminal, Target, AlertTriangle } from "lucide-react";
import { streamChat } from "@/lib/chat-client";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const SKILL_CATEGORIES = [
  {
    id: "prompt-injection", label: "Prompt Injection", icon: Terminal, color: "#ef4444",
    desc: "Manipulate AI models through crafted inputs. Direct injection, indirect injection via context, jailbreaking.",
    skills: ["Direct Prompt Injection", "Indirect Injection via RAG", "System Prompt Extraction", "Context Window Overflow", "Role Confusion", "Token Budget Manipulation"],
  },
  {
    id: "model-extraction", label: "Model Extraction", icon: Brain, color: "#8b5cf6",
    desc: "Reconstruct model architecture and training data through strategic querying and output analysis.",
    skills: ["Architecture Fingerprinting", "Training Data Extraction", "Membership Inference", "Model Inversion", "Embedding Extraction", "Hyperparameter Inference"],
  },
  {
    id: "adversarial", label: "Adversarial ML", icon: Zap, color: "#f59e0b",
    desc: "Craft inputs that fool ML models. Perturbation attacks, transferable attacks, physical-world attacks.",
    skills: ["FGSM Attack", "PGD Attack", "C&W Attack", "Black-Box Transfer", "Universal Perturbations", "Physical World Patches"],
  },
  {
    id: "agent-hacking", label: "Agent Hacking", icon: Target, color: "#3b82f6",
    desc: "Attack agentic AI systems. Tool poisoning, memory injection, goal hijacking, orchestration attacks.",
    skills: ["Tool Poisoning", "Memory Injection", "Goal Hijacking", "Parallel Agent Confusion", "API Key Exfiltration", "ReAct Loop Manipulation"],
  },
  {
    id: "data-poisoning", label: "Data Poisoning", icon: Bug, color: "#10b981",
    desc: "Corrupt training data to affect model behavior. Backdoor attacks, trojan insertion, label flipping.",
    skills: ["Backdoor Insertion", "Trojan Triggers", "Clean-Label Attacks", "Federated Learning Attacks", "Label Flipping", "Supply Chain Poisoning"],
  },
  {
    id: "defense", label: "AI Defense", icon: Shield, color: "#22c55e",
    desc: "Protect AI systems from attacks. Input validation, output filtering, adversarial training, red teaming.",
    skills: ["Input Sanitization", "Output Filtering", "Adversarial Training", "Red Team Workflows", "Monitoring & Alerting", "Constitutional AI"],
  },
];

const BOOK_CHAPTERS = [
  "Ch1: Introduction to AI Agent Security",
  "Ch2: Understanding Agent Architecture Vulnerabilities",
  "Ch3: Prompt Injection Deep Dive",
  "Ch4: Tool & API Security in Agents",
  "Ch5: Memory and Context Attacks",
  "Ch6: Multi-Agent System Security",
  "Ch7: Building Secure AI Agents with Gemini",
  "Ch8: Red Teaming AI Systems",
];

export function AIHackingSkillsModal({ open, onOpenChange }: Props) {
  const [selectedCat, setSelectedCat] = useState("prompt-injection");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [activeTab, setActiveTab] = useState<"skills" | "book">("skills");

  const cat = SKILL_CATEGORIES.find(c => c.id === selectedCat)!;
  const CatIcon = cat.icon;

  const runQuery = async () => {
    if (!query.trim() || streaming) return;
    setStreaming(true);
    setResponse("");
    try {
      const systemPrompt = `You are an expert AI security researcher specializing in ${cat.label}. 
${selectedSkill ? `Current skill focus: ${selectedSkill}` : ""}
Topic: ${cat.desc}

Based on the "Hack the AI Agent" book (Build agentic AI security skills with the Gemini API), provide:
1. Technical explanation of the attack/defense mechanism
2. Practical examples and proof-of-concept approaches
3. Detection and mitigation strategies
4. Relevant tools and frameworks
5. Real-world case studies when applicable

This is for defensive security research, CTF challenges, and authorized red team exercises.`;
      await streamChat({ model: "gpt-5.4", persona: null, customInstructions: "", language: "en", memory: [], messages: [{ role: "user", content: query }], customSystemPrompt: systemPrompt }, (chunk) => { setResponse(p => p + chunk); }, undefined);
    } catch {
      setResponse("Error connecting to AI. Please add your OPENAI_API_KEY in Secrets.");
    } finally {
      setStreaming(false);
    }
  };

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
            style={{ background: "#080808", borderColor: "rgba(139,92,246,0.25)", maxHeight: "90vh" }}>

            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(139,92,246,0.15)", background: "linear-gradient(135deg,#07040f,#080808)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
                  <Brain className="w-4 h-4" style={{ color: "#8b5cf6" }} />
                </div>
                <div>
                  <div className="text-sm font-bold" style={{ color: "#8b5cf6" }}>AI Hacking Skills</div>
                  <div className="text-[10px] font-mono" style={{ color: "#555" }}>Hack the AI Agent · Gemini API Security</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[9px] font-mono" style={{ borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)", color: "#ef4444" }}>
                  <AlertTriangle className="w-3 h-3" />AUTHORIZED USE ONLY
                </div>
                <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                  <X className="w-4 h-4" style={{ color: "#444" }} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b px-5" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              {(["skills", "book"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-colors capitalize"
                  style={{ borderColor: activeTab === tab ? "#8b5cf6" : "transparent", color: activeTab === tab ? "#8b5cf6" : "#333" }}>
                  {tab === "book" ? "Book Chapters" : tab}
                </button>
              ))}
            </div>

            {activeTab === "skills" && (
              <div className="flex flex-1 min-h-0">
                <div className="w-48 border-r py-2" style={{ borderColor: "rgba(255,255,255,0.05)", background: "#060606" }}>
                  {SKILL_CATEGORIES.map(c => {
                    const Icon = c.icon;
                    return (
                      <button key={c.id} onClick={() => { setSelectedCat(c.id); setSelectedSkill(""); }}
                        className="flex items-center gap-2 px-3 py-2.5 text-left text-[10px] font-bold transition-all mx-2 rounded-lg mb-0.5"
                        style={{ background: selectedCat === c.id ? `${c.color}15` : "transparent", color: selectedCat === c.id ? c.color : "#444", border: `1px solid ${selectedCat === c.id ? `${c.color}25` : "transparent"}`, width: "calc(100% - 16px)" }}>
                        <Icon className="w-3 h-3 flex-shrink-0" />{c.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex-1 flex flex-col min-w-0 p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <CatIcon className="w-4 h-4" style={{ color: cat.color }} />
                    <span className="text-sm font-bold" style={{ color: cat.color }}>{cat.label}</span>
                  </div>
                  <p className="text-[10px] font-mono mb-3" style={{ color: "#444" }}>{cat.desc}</p>

                  <div className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "#333" }}>Techniques</div>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {cat.skills.map(skill => (
                      <button key={skill} onClick={() => setSelectedSkill(selectedSkill === skill ? "" : skill)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-mono border transition-all"
                        style={{ borderColor: selectedSkill === skill ? `${cat.color}50` : "rgba(255,255,255,0.08)", background: selectedSkill === skill ? `${cat.color}10` : "rgba(255,255,255,0.02)", color: selectedSkill === skill ? cat.color : "#555" }}>
                        {skill}
                      </button>
                    ))}
                  </div>

                  <div className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "#333" }}>
                    AI Research{selectedSkill ? ` · ${selectedSkill}` : ""}
                  </div>
                  {response && (
                    <div className="overflow-y-auto rounded-lg p-3 mb-3 text-[11px] font-mono leading-relaxed" style={{ background: "rgba(0,0,0,0.4)", color: "#aaa", whiteSpace: "pre-wrap", maxHeight: "200px" }}>
                      {response}
                      {streaming && <span className="inline-block w-1.5 h-3.5 ml-0.5 animate-pulse" style={{ background: cat.color }} />}
                    </div>
                  )}
                  <div className="flex gap-2 mt-auto">
                    <input value={query} onChange={e => setQuery(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && runQuery()}
                      placeholder={selectedSkill ? `Ask about ${selectedSkill}...` : `Ask about ${cat.label}...`}
                      className="flex-1 px-3 py-2 rounded-lg text-[11px] font-mono border outline-none"
                      style={{ background: "#0a0a0a", borderColor: `${cat.color}25`, color: "#ddd" }} />
                    <button onClick={runQuery} disabled={!query.trim() || streaming}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold transition-all"
                      style={{ background: query.trim() && !streaming ? `${cat.color}20` : "rgba(255,255,255,0.05)", color: query.trim() && !streaming ? cat.color : "#333", border: `1px solid ${query.trim() && !streaming ? `${cat.color}40` : "rgba(255,255,255,0.08)"}` }}>
                      <Play className="w-3 h-3" />Ask
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "book" && (
              <div className="flex-1 overflow-y-auto p-5">
                <div className="mb-4 p-4 rounded-xl border" style={{ borderColor: "rgba(139,92,246,0.2)", background: "rgba(139,92,246,0.04)" }}>
                  <div className="text-[11px] font-bold mb-1" style={{ color: "#8b5cf6" }}>Hack the AI Agent</div>
                  <div className="text-[10px] font-mono" style={{ color: "#444" }}>Build agentic AI security skills with the Gemini API · Google · 2025</div>
                </div>
                <div className="space-y-2">
                  {BOOK_CHAPTERS.map((ch, i) => (
                    <button key={i} onClick={() => { setQuery(`Explain the content and key concepts from "${ch}" in the "Hack the AI Agent" book`); setActiveTab("skills"); }}
                      className="w-full text-left p-3.5 rounded-xl border transition-all hover:border-purple-500/30 group"
                      style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0a0a0a" }}>
                      <div className="flex items-center gap-3">
                        <BookOpen className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#444" }} />
                        <span className="text-[11px] font-mono" style={{ color: "#666" }}>{ch}</span>
                        <Zap className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#8b5cf6" }} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.05)", background: "#060606" }}>
              <div className="text-[9px] font-mono" style={{ color: "#222" }}>{SKILL_CATEGORIES.length} categories · Defensive research · CTF</div>
              <Brain className="w-3.5 h-3.5" style={{ color: "#1a1a1a" }} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
