import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Briefcase, GitMerge, Copy, CheckCheck, RotateCcw } from "lucide-react";
import { pipeline } from "@/lib/pipeline";

interface CareerOpsModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const TOOLS = [
  { id: "resume", label: "Resume Optimizer", icon: "📄", desc: "Paste your resume + job description → AI rewrites it ATS-optimized" },
  { id: "cover", label: "Cover Letter", icon: "✉️", desc: "Generate tailored cover letters that get callbacks" },
  { id: "interview", label: "Interview Prep", icon: "🎯", desc: "Role-specific interview questions + STAR answers" },
  { id: "salary", label: "Salary Negotiation", icon: "💰", desc: "Scripts and strategies for negotiating compensation" },
  { id: "linkedin", label: "LinkedIn Optimizer", icon: "🔗", desc: "Rewrite your LinkedIn profile for maximum recruiter visibility" },
  { id: "roadmap", label: "Career Roadmap", icon: "🗺️", desc: "AI-generated 6/12/24 month career progression plan" },
];

const PROMPTS: Record<string, string> = {
  resume: `You are an elite resume writer and ATS expert. Optimize this resume for the target role.

Rules:
1. Quantify every achievement with specific numbers/percentages
2. Use strong action verbs (Led, Engineered, Scaled, Delivered)
3. Mirror exact keywords from the job description
4. Structure: Summary → Experience → Skills → Education
5. Highlight impact, not just responsibilities
6. Remove weak phrases ("responsible for", "helped with")

Output the full optimized resume in clean markdown.`,
  cover: `You are a professional cover letter writer. Create a compelling, personalized cover letter.

Structure:
- Opening hook (specific, not generic)
- Why this company (show you researched them)
- 2-3 strongest relevant achievements with numbers
- Forward-looking closing paragraph

Tone: Confident, specific, human. No clichés. Max 300 words.`,
  interview: `You are a senior hiring manager and interview coach. For the given role:

1. List the 10 most likely interview questions (behavioral + technical)
2. For each question, provide a STAR-format model answer (Situation, Task, Action, Result)
3. Include 3 questions the candidate should ask the interviewer
4. Common mistakes to avoid for this specific role

Be specific and tactical.`,
  salary: `You are a compensation negotiation expert. Create a complete negotiation strategy:

1. Market research framework (how to find the real range)
2. Opening anchor script (exact words to say)
3. Counter-offer response scripts for common pushbacks
4. Non-salary benefits to negotiate (equity, PTO, remote work, signing bonus)
5. Walk-away line (how to handle final offers)

Include actual scripts and specific phrases.`,
  linkedin: `You are a LinkedIn optimization expert. Rewrite this profile for maximum recruiter visibility:

1. Headline: 3 variations (keyword-rich, value-focused)
2. About section: Hook + value prop + achievements + CTA
3. Experience bullets: Impact-focused with keywords
4. Skills section: Top 20 skills to add
5. Creator tips: Content strategy for your field

Make it recruiter-magnetic while staying authentic.`,
  roadmap: `You are a career strategist. Create a detailed 24-month career roadmap:

Month 1-3: Quick wins and foundation
Month 4-6: Skill development and visibility
Month 7-12: Strategic positioning
Year 2: Leadership and scale

For each phase include:
- Specific skills to develop (with resources)
- Certifications to pursue
- Network targets
- Portfolio/projects to build
- Metrics to track progress`,
};

export function CareerOpsModal({ open, onOpenChange }: CareerOpsModalProps) {
  const [tool, setTool] = useState("resume");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    if (!input.trim() || running) return;
    setRunning(true);
    setOutput("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: PROMPTS[tool] },
            { role: "user", content: input },
          ],
          model: "gpt-5.4",
          stream: true,
        }),
      });
      const reader = res.body?.getReader();
      const dec = new TextDecoder();
      let buf = "", full = "";
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (raw === "[DONE]") continue;
          try { const chunk = JSON.parse(raw); const delta = chunk.choices?.[0]?.delta?.content ?? ""; full += delta; setOutput(full); } catch { /* ignore */ }
        }
      }
      pipeline.push({ source: "CAREEROPS", sourceColor: "#0ea5e9", label: `${TOOLS.find((t) => t.id === tool)?.label}`, content: full });
    } catch { /* ignore */ }
    setRunning(false);
  }

  const activeTool = TOOLS.find((t) => t.id === tool)!;

  if (!open) return null;
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
          style={{ backdropFilter: "blur(10px)", background: "rgba(0,0,0,0.85)" }}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
            style={{ background: "#080808", border: "1px solid rgba(14,165,233,0.25)", boxShadow: "0 0 60px rgba(14,165,233,0.1)" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(14,165,233,0.2)", background: "rgba(14,165,233,0.04)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ background: "rgba(14,165,233,0.1)", borderColor: "rgba(14,165,233,0.4)" }}>
                  <Briefcase className="w-4 h-4" style={{ color: "#0ea5e9" }} />
                </div>
                <div>
                  <div className="text-sm font-black tracking-widest" style={{ color: "#0ea5e9" }}>CAREER OPS</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "#555" }}>AI-powered career intelligence suite</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setOutput(""); setInput(""); }} className="p-1.5 rounded-lg text-gray-600 hover:text-sky-400 transition-colors"><RotateCcw className="w-4 h-4" /></button>
                <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg text-gray-600 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="flex gap-1 p-3 border-b flex-wrap" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {TOOLS.map((t) => (
                <button key={t.id} onClick={() => { setTool(t.id); setOutput(""); }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all"
                  style={{ background: tool === t.id ? "rgba(14,165,233,0.15)" : "transparent", borderColor: tool === t.id ? "rgba(14,165,233,0.5)" : "rgba(255,255,255,0.08)", color: tool === t.id ? "#0ea5e9" : "#444" }}>
                  <span>{t.icon}</span> {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {!output && !running ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <div className="text-3xl">{activeTool.icon}</div>
                  <div className="text-[12px] font-bold" style={{ color: "#0ea5e9" }}>{activeTool.label}</div>
                  <div className="text-[11px]" style={{ color: "#444" }}>{activeTool.desc}</div>
                </div>
              ) : (
                <div className="text-[11px] leading-relaxed whitespace-pre-wrap font-mono" style={{ color: "#888" }}>
                  {output}{running && <span className="animate-pulse">▊</span>}
                </div>
              )}
            </div>

            {output && !running && (
              <div className="px-4 py-2 flex items-center gap-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <button onClick={() => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border"
                  style={{ background: "rgba(14,165,233,0.06)", borderColor: "rgba(14,165,233,0.2)", color: "#0ea5e9" }}>
                  {copied ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button onClick={() => pipeline.push({ source: "CAREEROPS", sourceColor: "#0ea5e9", label: activeTool.label, content: output })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border"
                  style={{ background: "rgba(0,229,204,0.06)", borderColor: "rgba(0,229,204,0.2)", color: "#00e5cc" }}>
                  <GitMerge className="w-3 h-3" /> Pipe
                </button>
              </div>
            )}

            <div className="p-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex gap-2">
                <textarea value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generate(); } }}
                  placeholder={tool === "resume" ? "Paste your resume + job description…" : tool === "interview" ? "Enter the job role and company…" : "Describe your situation…"}
                  disabled={running} rows={3}
                  className="flex-1 bg-transparent border rounded-xl px-3 py-2 text-[12px] outline-none resize-none"
                  style={{ borderColor: "rgba(14,165,233,0.2)", color: "#ccc" }} />
                <button onClick={generate} disabled={running || !input.trim()}
                  className="w-9 rounded-xl flex items-center justify-center disabled:opacity-30"
                  style={{ background: "rgba(14,165,233,0.2)", border: "1px solid rgba(14,165,233,0.4)" }}>
                  <Send className="w-4 h-4" style={{ color: "#0ea5e9" }} />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
