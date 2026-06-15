import { useState, useRef, useEffect } from "react";
import {
  X, Zap, Brain, Play, Square, Copy, CheckCheck, RefreshCw,
  ChevronDown, ChevronUp, Sparkles, Star, Lock, Check, Infinity,
  Flame, Filter, Shield, Globe,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { streamChat, type ChatMessage } from "@/lib/chat-client";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

const KEY_PREFIX = "mr7-provider-key-";
const URL_PREFIX = "mr7-provider-url-";

type FusionModel = {
  id: string;
  label: string;
  providerKey: string;
  providerName: string;
  color: string;
  baseURL: string;
  costTag: "free" | "$" | "$$" | "$$$";
  category: "reasoning" | "coding" | "general" | "fast" | "security" | "arabic" | "multimodal";
};

export const TOP_FUSION_MODELS: FusionModel[] = [
  // ── Groq Free ──────────────────────────────────────────────────────────
  { id: "llama-3.3-70b-versatile",              label: "Llama 3.3 70B",           providerKey: "groq",       providerName: "Groq",         color: "#8b5cf6", baseURL: "https://api.groq.com/openai/v1",         costTag: "free", category: "general" },
  { id: "deepseek-r1-distill-llama-70b",         label: "DeepSeek R1 70B",         providerKey: "groq",       providerName: "Groq",         color: "#8b5cf6", baseURL: "https://api.groq.com/openai/v1",         costTag: "free", category: "reasoning" },
  { id: "qwen-qwq-32b",                          label: "QwQ 32B Thinking",        providerKey: "groq",       providerName: "Groq",         color: "#8b5cf6", baseURL: "https://api.groq.com/openai/v1",         costTag: "free", category: "reasoning" },
  { id: "gemma2-9b-it",                          label: "Gemma 2 9B",              providerKey: "groq",       providerName: "Groq",         color: "#8b5cf6", baseURL: "https://api.groq.com/openai/v1",         costTag: "free", category: "fast" },
  { id: "llama-3.1-8b-instant",                  label: "Llama 3.1 8B Instant",    providerKey: "groq",       providerName: "Groq",         color: "#8b5cf6", baseURL: "https://api.groq.com/openai/v1",         costTag: "free", category: "fast" },
  { id: "llama-3.3-70b-specdec",                 label: "Llama 3.3 70B SpecDec",   providerKey: "groq",       providerName: "Groq",         color: "#8b5cf6", baseURL: "https://api.groq.com/openai/v1",         costTag: "free", category: "fast" },
  { id: "mixtral-8x7b-32768",                    label: "Mixtral 8x7B",            providerKey: "groq",       providerName: "Groq",         color: "#8b5cf6", baseURL: "https://api.groq.com/openai/v1",         costTag: "free", category: "general" },
  { id: "llama-3.2-11b-vision-preview",          label: "Llama 3.2 11B Vision",    providerKey: "groq",       providerName: "Groq",         color: "#8b5cf6", baseURL: "https://api.groq.com/openai/v1",         costTag: "free", category: "multimodal" },
  { id: "deepseek-r1-distill-qwen-32b",          label: "DeepSeek R1 Qwen 32B",    providerKey: "groq",       providerName: "Groq",         color: "#8b5cf6", baseURL: "https://api.groq.com/openai/v1",         costTag: "free", category: "reasoning" },
  { id: "llama3-70b-8192",                       label: "Llama 3 70B",             providerKey: "groq",       providerName: "Groq",         color: "#8b5cf6", baseURL: "https://api.groq.com/openai/v1",         costTag: "free", category: "general" },
  { id: "llama3-8b-8192",                        label: "Llama 3 8B",              providerKey: "groq",       providerName: "Groq",         color: "#8b5cf6", baseURL: "https://api.groq.com/openai/v1",         costTag: "free", category: "fast" },
  { id: "compound-beta",                         label: "Groq Compound Beta",      providerKey: "groq",       providerName: "Groq",         color: "#8b5cf6", baseURL: "https://api.groq.com/openai/v1",         costTag: "free", category: "reasoning" },
  // ── OpenAI ────────────────────────────────────────────────────────────
  { id: "gpt-4o",                                label: "GPT-4o",                  providerKey: "openai",     providerName: "OpenAI",       color: "#10b981", baseURL: "https://api.openai.com/v1",               costTag: "$$$",  category: "general" },
  { id: "gpt-4o-mini",                           label: "GPT-4o Mini",             providerKey: "openai",     providerName: "OpenAI",       color: "#10b981", baseURL: "https://api.openai.com/v1",               costTag: "$",    category: "fast" },
  { id: "o4-mini",                               label: "o4-mini Reasoning",       providerKey: "openai",     providerName: "OpenAI",       color: "#10b981", baseURL: "https://api.openai.com/v1",               costTag: "$$",   category: "reasoning" },
  { id: "o3",                                    label: "o3 Full Reasoning",       providerKey: "openai",     providerName: "OpenAI",       color: "#10b981", baseURL: "https://api.openai.com/v1",               costTag: "$$$",  category: "reasoning" },
  { id: "o3-mini",                               label: "o3-mini",                 providerKey: "openai",     providerName: "OpenAI",       color: "#10b981", baseURL: "https://api.openai.com/v1",               costTag: "$$",   category: "reasoning" },
  { id: "gpt-4.1",                               label: "GPT-4.1",                 providerKey: "openai",     providerName: "OpenAI",       color: "#10b981", baseURL: "https://api.openai.com/v1",               costTag: "$$$",  category: "coding" },
  { id: "gpt-4.1-mini",                          label: "GPT-4.1 Mini",            providerKey: "openai",     providerName: "OpenAI",       color: "#10b981", baseURL: "https://api.openai.com/v1",               costTag: "$",    category: "fast" },
  { id: "gpt-4-turbo",                           label: "GPT-4 Turbo",             providerKey: "openai",     providerName: "OpenAI",       color: "#10b981", baseURL: "https://api.openai.com/v1",               costTag: "$$$",  category: "general" },
  // ── Anthropic ────────────────────────────────────────────────────────
  { id: "claude-opus-4-5",                       label: "Claude Opus 4.5",         providerKey: "anthropic",  providerName: "Anthropic",    color: "#f59e0b", baseURL: "https://api.anthropic.com/v1",            costTag: "$$$",  category: "general" },
  { id: "claude-sonnet-4-5",                     label: "Claude Sonnet 4.5",       providerKey: "anthropic",  providerName: "Anthropic",    color: "#f59e0b", baseURL: "https://api.anthropic.com/v1",            costTag: "$$",   category: "general" },
  { id: "claude-3-5-sonnet-20241022",            label: "Claude 3.5 Sonnet",       providerKey: "anthropic",  providerName: "Anthropic",    color: "#f59e0b", baseURL: "https://api.anthropic.com/v1",            costTag: "$$",   category: "general" },
  { id: "claude-3-5-haiku-20241022",             label: "Claude 3.5 Haiku",        providerKey: "anthropic",  providerName: "Anthropic",    color: "#f59e0b", baseURL: "https://api.anthropic.com/v1",            costTag: "$",    category: "fast" },
  { id: "claude-3-haiku-20240307",               label: "Claude 3 Haiku",          providerKey: "anthropic",  providerName: "Anthropic",    color: "#f59e0b", baseURL: "https://api.anthropic.com/v1",            costTag: "$",    category: "fast" },
  { id: "claude-3-opus-20240229",                label: "Claude 3 Opus",           providerKey: "anthropic",  providerName: "Anthropic",    color: "#f59e0b", baseURL: "https://api.anthropic.com/v1",            costTag: "$$$",  category: "reasoning" },
  // ── Google Gemini ─────────────────────────────────────────────────────
  { id: "gemini-2.5-pro",                        label: "Gemini 2.5 Pro",          providerKey: "gemini",     providerName: "Google",       color: "#4285f4", baseURL: "https://generativelanguage.googleapis.com/v1beta", costTag: "$$$", category: "reasoning" },
  { id: "gemini-2.5-flash",                      label: "Gemini 2.5 Flash",        providerKey: "gemini",     providerName: "Google",       color: "#4285f4", baseURL: "https://generativelanguage.googleapis.com/v1beta", costTag: "$",   category: "fast" },
  { id: "gemini-2.0-flash-exp",                  label: "Gemini 2.0 Flash",        providerKey: "gemini",     providerName: "Google",       color: "#4285f4", baseURL: "https://generativelanguage.googleapis.com/v1beta", costTag: "free", category: "fast" },
  { id: "gemini-1.5-pro-latest",                 label: "Gemini 1.5 Pro",          providerKey: "gemini",     providerName: "Google",       color: "#4285f4", baseURL: "https://generativelanguage.googleapis.com/v1beta", costTag: "$",   category: "multimodal" },
  { id: "gemini-1.5-flash-latest",               label: "Gemini 1.5 Flash",        providerKey: "gemini",     providerName: "Google",       color: "#4285f4", baseURL: "https://generativelanguage.googleapis.com/v1beta", costTag: "free", category: "fast" },
  { id: "gemma-3-27b-it",                        label: "Gemma 3 27B",             providerKey: "gemini",     providerName: "Google",       color: "#4285f4", baseURL: "https://generativelanguage.googleapis.com/v1beta", costTag: "free", category: "general" },
  // ── DeepSeek ─────────────────────────────────────────────────────────
  { id: "deepseek-chat",                         label: "DeepSeek V3",             providerKey: "deepseek",   providerName: "DeepSeek",     color: "#06b6d4", baseURL: "https://api.deepseek.com/v1",             costTag: "$",    category: "coding" },
  { id: "deepseek-reasoner",                     label: "DeepSeek R1 Full",        providerKey: "deepseek",   providerName: "DeepSeek",     color: "#06b6d4", baseURL: "https://api.deepseek.com/v1",             costTag: "$$",   category: "reasoning" },
  { id: "deepseek-coder",                        label: "DeepSeek Coder V2",       providerKey: "deepseek",   providerName: "DeepSeek",     color: "#06b6d4", baseURL: "https://api.deepseek.com/v1",             costTag: "$",    category: "coding" },
  // ── xAI Grok ─────────────────────────────────────────────────────────
  { id: "grok-3",                                label: "Grok 3",                  providerKey: "xai",        providerName: "xAI",          color: "#e11d48", baseURL: "https://api.x.ai/v1",                     costTag: "$$$",  category: "general" },
  { id: "grok-3-mini",                           label: "Grok 3 Mini",             providerKey: "xai",        providerName: "xAI",          color: "#e11d48", baseURL: "https://api.x.ai/v1",                     costTag: "$",    category: "fast" },
  { id: "grok-2-latest",                         label: "Grok 2",                  providerKey: "xai",        providerName: "xAI",          color: "#e11d48", baseURL: "https://api.x.ai/v1",                     costTag: "$$",   category: "general" },
  { id: "grok-vision-beta",                      label: "Grok Vision",             providerKey: "xai",        providerName: "xAI",          color: "#e11d48", baseURL: "https://api.x.ai/v1",                     costTag: "$$",   category: "multimodal" },
  // ── Mistral ──────────────────────────────────────────────────────────
  { id: "mistral-large-latest",                  label: "Mistral Large",           providerKey: "mistral",    providerName: "Mistral AI",   color: "#ff7000", baseURL: "https://api.mistral.ai/v1",               costTag: "$$",   category: "general" },
  { id: "mistral-medium-latest",                 label: "Mistral Medium",          providerKey: "mistral",    providerName: "Mistral AI",   color: "#ff7000", baseURL: "https://api.mistral.ai/v1",               costTag: "$",    category: "general" },
  { id: "codestral-latest",                      label: "Codestral",               providerKey: "mistral",    providerName: "Mistral AI",   color: "#ff7000", baseURL: "https://api.mistral.ai/v1",               costTag: "$",    category: "coding" },
  { id: "pixtral-large-latest",                  label: "Pixtral Large",           providerKey: "mistral",    providerName: "Mistral AI",   color: "#ff7000", baseURL: "https://api.mistral.ai/v1",               costTag: "$$",   category: "multimodal" },
  { id: "mistral-small-latest",                  label: "Mistral Small",           providerKey: "mistral",    providerName: "Mistral AI",   color: "#ff7000", baseURL: "https://api.mistral.ai/v1",               costTag: "free", category: "fast" },
  // ── Perplexity ───────────────────────────────────────────────────────
  { id: "sonar-pro",                             label: "Sonar Pro",               providerKey: "perplexity", providerName: "Perplexity",   color: "#22d3ee", baseURL: "https://api.perplexity.ai",               costTag: "$$",   category: "general" },
  { id: "sonar",                                 label: "Sonar",                   providerKey: "perplexity", providerName: "Perplexity",   color: "#22d3ee", baseURL: "https://api.perplexity.ai",               costTag: "$",    category: "fast" },
  { id: "sonar-reasoning-pro",                   label: "Sonar Reasoning Pro",     providerKey: "perplexity", providerName: "Perplexity",   color: "#22d3ee", baseURL: "https://api.perplexity.ai",               costTag: "$$$",  category: "reasoning" },
  { id: "sonar-reasoning",                       label: "Sonar Reasoning",         providerKey: "perplexity", providerName: "Perplexity",   color: "#22d3ee", baseURL: "https://api.perplexity.ai",               costTag: "$$",   category: "reasoning" },
  // ── OpenRouter Free ──────────────────────────────────────────────────
  { id: "meta-llama/llama-3.3-70b-instruct:free",  label: "Llama 3.3 70B (OR)",   providerKey: "openrouter", providerName: "OpenRouter",   color: "#ef4444", baseURL: "https://openrouter.ai/api/v1",            costTag: "free", category: "general" },
  { id: "mistralai/mistral-7b-instruct:free",       label: "Mistral 7B (OR)",      providerKey: "openrouter", providerName: "OpenRouter",   color: "#ef4444", baseURL: "https://openrouter.ai/api/v1",            costTag: "free", category: "fast" },
  { id: "google/gemma-3-27b-it:free",               label: "Gemma 3 27B (OR)",     providerKey: "openrouter", providerName: "OpenRouter",   color: "#ef4444", baseURL: "https://openrouter.ai/api/v1",            costTag: "free", category: "general" },
  { id: "deepseek/deepseek-chat-v3-0324:free",      label: "DeepSeek V3 (OR)",     providerKey: "openrouter", providerName: "OpenRouter",   color: "#ef4444", baseURL: "https://openrouter.ai/api/v1",            costTag: "free", category: "coding" },
  { id: "qwen/qwq-32b:free",                        label: "QwQ 32B (OR Free)",    providerKey: "openrouter", providerName: "OpenRouter",   color: "#ef4444", baseURL: "https://openrouter.ai/api/v1",            costTag: "free", category: "reasoning" },
  { id: "microsoft/phi-4:free",                     label: "Phi-4 (OR)",           providerKey: "openrouter", providerName: "OpenRouter",   color: "#ef4444", baseURL: "https://openrouter.ai/api/v1",            costTag: "free", category: "general" },
  { id: "qwen/qwen3-235b-a22b:free",                label: "Qwen3 235B (OR)",      providerKey: "openrouter", providerName: "OpenRouter",   color: "#ef4444", baseURL: "https://openrouter.ai/api/v1",            costTag: "free", category: "reasoning" },
  { id: "tngtech/deepseek-r1t-chimera:free",        label: "DeepSeek R1T Chimera", providerKey: "openrouter", providerName: "OpenRouter",   color: "#ef4444", baseURL: "https://openrouter.ai/api/v1",            costTag: "free", category: "reasoning" },
  // ── OpenRouter Paid ──────────────────────────────────────────────────
  { id: "openai/o3",                                label: "o3 (OpenRouter)",       providerKey: "openrouter", providerName: "OpenRouter",   color: "#ef4444", baseURL: "https://openrouter.ai/api/v1",            costTag: "$$$",  category: "reasoning" },
  { id: "anthropic/claude-opus-4",                  label: "Claude Opus 4 (OR)",   providerKey: "openrouter", providerName: "OpenRouter",   color: "#ef4444", baseURL: "https://openrouter.ai/api/v1",            costTag: "$$$",  category: "general" },
  { id: "google/gemini-2.5-pro",                    label: "Gemini 2.5 Pro (OR)",  providerKey: "openrouter", providerName: "OpenRouter",   color: "#ef4444", baseURL: "https://openrouter.ai/api/v1",            costTag: "$$$",  category: "reasoning" },
  { id: "x-ai/grok-3",                              label: "Grok 3 (OR)",          providerKey: "openrouter", providerName: "OpenRouter",   color: "#ef4444", baseURL: "https://openrouter.ai/api/v1",            costTag: "$$$",  category: "general" },
  { id: "deepseek/deepseek-r1",                     label: "DeepSeek R1 (OR)",     providerKey: "openrouter", providerName: "OpenRouter",   color: "#ef4444", baseURL: "https://openrouter.ai/api/v1",            costTag: "$$",   category: "reasoning" },
  // ── Security Specialists ─────────────────────────────────────────────
  { id: "llama-3.3-70b-versatile",                  label: "KaliGPT Security",     providerKey: "groq",       providerName: "Groq",         color: "#e21227", baseURL: "https://api.groq.com/openai/v1",         costTag: "free", category: "security" },
  { id: "gpt-4o",                                   label: "PenTest GPT-4o",       providerKey: "openai",     providerName: "OpenAI",       color: "#e21227", baseURL: "https://api.openai.com/v1",               costTag: "$$$",  category: "security" },
  { id: "claude-sonnet-4-5",                        label: "RedTeam Claude",       providerKey: "anthropic",  providerName: "Anthropic",    color: "#e21227", baseURL: "https://api.anthropic.com/v1",            costTag: "$$",   category: "security" },
  { id: "deepseek-reasoner",                        label: "CVE Analyst R1",       providerKey: "deepseek",   providerName: "DeepSeek",     color: "#e21227", baseURL: "https://api.deepseek.com/v1",             costTag: "$$",   category: "security" },
  { id: "grok-3",                                   label: "Threat Intel Grok",    providerKey: "xai",        providerName: "xAI",          color: "#e21227", baseURL: "https://api.x.ai/v1",                     costTag: "$$$",  category: "security" },
  // ── Arabic / MENA ────────────────────────────────────────────────────
  { id: "qwen-qwq-32b",                             label: "عربي QwQ 32B",         providerKey: "groq",       providerName: "Groq",         color: "#fbbf24", baseURL: "https://api.groq.com/openai/v1",         costTag: "free", category: "arabic" },
  { id: "mistral-large-latest",                     label: "عربي Mistral Large",   providerKey: "mistral",    providerName: "Mistral AI",   color: "#fbbf24", baseURL: "https://api.mistral.ai/v1",               costTag: "$$",   category: "arabic" },
  { id: "gpt-4o",                                   label: "عربي GPT-4o",          providerKey: "openai",     providerName: "OpenAI",       color: "#fbbf24", baseURL: "https://api.openai.com/v1",               costTag: "$$$",  category: "arabic" },
  { id: "claude-opus-4-5",                          label: "عربي Claude Opus",     providerKey: "anthropic",  providerName: "Anthropic",    color: "#fbbf24", baseURL: "https://api.anthropic.com/v1",            costTag: "$$$",  category: "arabic" },
  { id: "gemini-2.5-pro",                           label: "عربي Gemini 2.5",      providerKey: "gemini",     providerName: "Google",       color: "#fbbf24", baseURL: "https://generativelanguage.googleapis.com/v1beta", costTag: "$$$", category: "arabic" },
];

const COST_COLOR: Record<string, string> = {
  free: "text-emerald-400 border-emerald-500/30 bg-emerald-500/8",
  "$": "text-amber-400 border-amber-500/30 bg-amber-500/8",
  "$$": "text-orange-400 border-orange-500/30 bg-orange-500/8",
  "$$$": "text-red-400 border-red-500/30 bg-red-500/8",
};

const CAT_LABELS: Record<string, string> = {
  reasoning: "تفكير",
  coding: "كود",
  general: "عام",
  fast: "سريع",
  security: "أمن",
  arabic: "عربي",
  multimodal: "متعدد",
};

function FusionHeader3D({ running, doneCount, total }: { running: boolean; doneCount: number; total: number }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    const cx = W / 2, cy = H / 2;
    const nodeCount = Math.max(3, Math.min(20, total || 8));
    const nodes = Array.from({ length: nodeCount }, (_, i) => {
      const a = (i / nodeCount) * Math.PI * 2;
      return { x: cx + Math.cos(a) * 52, y: cy + Math.sin(a) * 22, a, phase: Math.random() * Math.PI * 2, done: i < doneCount };
    });
    function draw(t: number) {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(8,8,8,0.0)"; ctx.fillRect(0, 0, W, H);
      // connections
      nodes.forEach((n1, i) => {
        nodes.forEach((n2, j) => {
          if (j <= i) return;
          const dist = Math.hypot(n1.x - n2.x, n1.y - n2.y);
          if (dist > 80) return;
          const alpha = 0.04 + Math.sin(t * 0.8 + i * 0.5 + j * 0.3) * 0.03;
          ctx.beginPath(); ctx.moveTo(n1.x, n1.y); ctx.lineTo(n2.x, n2.y);
          ctx.strokeStyle = `rgba(167,139,250,${alpha})`; ctx.lineWidth = 0.5; ctx.stroke();
        });
      });
      // flowing particles on ring
      for (let p = 0; p < 8; p++) {
        const a = ((t * 0.6 + p / 8) % 1) * Math.PI * 2;
        const px = cx + Math.cos(a) * 52;
        const py = cy + Math.sin(a) * 22;
        const alpha = running ? 0.7 + Math.sin(t * 3 + p) * 0.3 : 0.3;
        ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = running ? `rgba(167,139,250,${alpha})` : `rgba(100,80,180,0.3)`;
        ctx.fill();
      }
      // nodes
      nodes.forEach((n, i) => {
        const pulse = 0.5 + Math.sin(t * 2.5 + n.phase) * 0.5;
        const isDone = i < doneCount;
        const r = 4 + (running && !isDone ? pulse * 2 : 0);
        const col = isDone ? "#22c55e" : running && i === doneCount ? "#a78bfa" : "rgba(100,80,180,0.6)";
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.fill();
        if (running && i === doneCount) {
          ctx.beginPath(); ctx.arc(n.x, n.y, r + 3 + pulse * 3, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(167,139,250,0.4)"; ctx.lineWidth = 1; ctx.stroke();
        }
      });
      // center orb
      const cPulse = 0.7 + Math.sin(t * 3) * 0.3;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 10 * (running ? cPulse : 0.6));
      grad.addColorStop(0, running ? "rgba(167,139,250,0.9)" : "rgba(80,50,140,0.5)");
      grad.addColorStop(1, "rgba(167,139,250,0)");
      ctx.beginPath(); ctx.arc(cx, cy, 10 * (running ? cPulse : 0.6), 0, Math.PI * 2);
      ctx.fillStyle = grad; ctx.fill();
    }
    function loop() {
      tRef.current += 0.016;
      draw(tRef.current);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, doneCount, total]);
  return (
    <canvas ref={cvRef} width={200} height={60}
      style={{ width: 200, height: 60, display: "block", imageRendering: "auto", opacity: 0.85 }} />
  );
}

type FusionResult = {
  modelId: string;
  label: string;
  providerName: string;
  color: string;
  content: string;
  status: "idle" | "streaming" | "done" | "error";
  error?: string;
};

interface HyperFusionModalProps {
  open: boolean;
  onClose: () => void;
  initialQuery?: string;
  chatHistory?: ChatMessage[];
}

export function HyperFusionModal({ open, onClose, initialQuery = "", chatHistory = [] }: HyperFusionModalProps) {
  const { state } = useStore();
  const { toast } = useToast();

  const [selectedModels, setSelectedModels] = useState<Set<string>>(() =>
    new Set(TOP_FUSION_MODELS.filter(m => m.providerKey === "groq").map(m => m.id))
  );
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<FusionResult[]>([]);
  const [running, setRunning] = useState(false);
  const [synthesis, setSynthesis] = useState("");
  const [synthStreaming, setSynthStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
  const [catFilter, setCatFilter] = useState<string>("all");
  const abortRefs = useRef<AbortController[]>([]);
  const synthAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open && initialQuery) setQuery(initialQuery);
  }, [open, initialQuery]);

  function getApiKey(providerKey: string): string | undefined {
    const k = localStorage.getItem(KEY_PREFIX + providerKey);
    return k?.trim() || undefined;
  }

  function getBaseURL(model: FusionModel): string {
    return localStorage.getItem(URL_PREFIX + model.providerKey)?.trim() || model.baseURL;
  }

  function isModelAvailable(model: FusionModel): boolean {
    if (model.providerKey === "personal") return !!state.settings.personalApiKey;
    return !!getApiKey(model.providerKey);
  }

  const availableModels = TOP_FUSION_MODELS.filter(m => isModelAvailable(m));
  const displayModels = catFilter === "all" ? TOP_FUSION_MODELS : TOP_FUSION_MODELS.filter(m => m.category === catFilter);
  const selectedList = TOP_FUSION_MODELS.filter(m => selectedModels.has(m.id));

  function toggleModel(id: string) {
    setSelectedModels(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAllAvailable() {
    setSelectedModels(new Set(availableModels.map(m => m.id)));
  }

  function selectFreeOnly() {
    setSelectedModels(new Set(availableModels.filter(m => m.costTag === "free").map(m => m.id)));
  }

  function selectByCategory(cat: string) {
    const cats = availableModels.filter(m => m.category === cat);
    if (cats.length > 0) setSelectedModels(new Set(cats.map(m => m.id)));
  }

  async function runFusion() {
    if (!query.trim()) { toast({ description: "أدخل سؤالاً أولاً" }); return; }
    const toRun = selectedList.filter(m => isModelAvailable(m));
    if (toRun.length === 0) { toast({ description: "اختر نموذجاً واحداً على الأقل (يحتاج مفتاح API)" }); return; }

    setRunning(true);
    setSynthesis("");

    const msgs: ChatMessage[] = [...chatHistory, { role: "user", content: query }];
    const initResults: FusionResult[] = toRun.map(m => ({
      modelId: m.id, label: m.label, providerName: m.providerName, color: m.color, content: "", status: "streaming",
    }));
    setResults(initResults);
    setExpandedModels(new Set(toRun.map(m => m.id)));

    const controllers = toRun.map(() => new AbortController());
    abortRefs.current = controllers;

    await Promise.allSettled(toRun.map(async (model, idx) => {
      const apiKey = getApiKey(model.providerKey) ?? (model.providerKey === "personal" ? state.settings.personalApiKey : undefined) ?? undefined;
      const baseURL = getBaseURL(model);
      try {
        await streamChat(
          { model: model.id, persona: null, customInstructions: "", language: state.settings.language, memory: [], messages: msgs, mode: "chat", provider: model.providerKey, providerModel: model.id, apiKey, apiBaseURL: baseURL },
          (chunk) => { setResults(prev => prev.map((r, i) => i === idx ? { ...r, content: r.content + chunk } : r)); },
          controllers[idx].signal,
        );
        setResults(prev => prev.map((r, i) => i === idx ? { ...r, status: "done" } : r));
      } catch (err) {
        const isAbort = (err as { name?: string })?.name === "AbortError";
        const errMsg = err instanceof Error ? err.message.slice(0, 120) : "فشل الاتصال";
        setResults(prev => prev.map((r, i) => i === idx ? { ...r, status: isAbort ? "done" : "error", error: errMsg } : r));
      }
    }));

    setRunning(false);
  }

  async function runSynthesis() {
    const doneResults = results.filter(r => r.status === "done" && r.content.trim());
    if (doneResults.length < 2) { toast({ description: "تحتاج نتيجتين على الأقل للمزج" }); return; }
    setSynthStreaming(true);
    setSynthesis("");
    synthAbortRef.current = new AbortController();
    const ctx = doneResults.map(r => `### ${r.label}:\n${r.content.slice(0, 1500)}`).join("\n\n---\n\n");
    const synthQ = `لديك ردود من ${doneResults.length} نموذج على: "${query.slice(0,200)}"\n\n${ctx}\n\n---\nاكتب synthesis شاملاً ودقيقاً يجمع أفضل ما في كل رد مع الخلاصة النهائية.`;
    try {
      await streamChat(
        { model: state.activeModel, persona: state.activePersona, customInstructions: "", language: state.settings.language, memory: [], messages: [{ role: "user", content: synthQ }], mode: "chat", provider: state.activeProvider, providerModel: state.activeProviderModel, apiKey: state.settings.personalApiKey || undefined, apiBaseURL: state.settings.personalApiBaseURL || undefined },
        (chunk) => { setSynthesis(prev => prev + chunk); },
        synthAbortRef.current.signal,
      );
    } catch { /* silent */ }
    setSynthStreaming(false);
  }

  function stopAll() {
    abortRefs.current.forEach(c => c.abort());
    synthAbortRef.current?.abort();
    setRunning(false);
    setSynthStreaming(false);
  }

  function copyText(text: string, id: string) {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  }

  const doneCount = results.filter(r => r.status === "done" || r.status === "error").length;
  const successCount = results.filter(r => r.status === "done").length;

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
          style={{ background: "rgba(0,0,0,0.90)" }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>

          <motion.div initial={{ scale: 0.93, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.93, opacity: 0, y: 10 }} transition={{ duration: 0.22 }}
            className="relative w-full max-w-3xl max-h-[94vh] flex flex-col rounded-2xl border overflow-hidden"
            style={{ background: "#080808", borderColor: "rgba(167,139,250,0.45)", boxShadow: "0 0 80px rgba(167,139,250,0.18), 0 25px 60px rgba(0,0,0,0.9)" }}>

            {/* Header */}
            <div className="px-5 py-3.5 border-b flex items-center gap-3 shrink-0"
              style={{ borderColor: "rgba(167,139,250,0.2)", background: "linear-gradient(135deg,rgba(167,139,250,0.1),rgba(226,18,39,0.05))" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(167,139,250,0.18)", border: "1px solid rgba(167,139,250,0.4)" }}>
                <Infinity className="w-5 h-5" style={{ color: "#a78bfa" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[14px] font-black tracking-wide">HYPER FUSION ULTIMATE</span>
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded border"
                    style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa", borderColor: "rgba(167,139,250,0.3)" }}>INDEPENDENT</span>
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded border"
                    style={{ background: "rgba(226,18,39,0.10)", color: "#e21227", borderColor: "rgba(226,18,39,0.3)" }}>{TOP_FUSION_MODELS.length} MODELS</span>
                  {running && (
                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded animate-pulse"
                      style={{ background: "rgba(167,139,250,0.2)", color: "#c4b5fd" }}>{doneCount}/{selectedList.filter(m => isModelAvailable(m)).length} مكتمل</span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">تشغيل متوازي مستقل — منفصل تماماً عن Council of 105 Brains</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#1f1f1f] text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* 3D Neural Sync Visualizer */}
            <div className="px-5 py-2 border-b flex items-center justify-between"
              style={{ borderColor: "rgba(167,139,250,0.15)", background: "rgba(0,0,0,0.4)" }}>
              <FusionHeader3D running={running} doneCount={doneCount} total={selectedList.filter(m => isModelAvailable(m)).length || 8} />
              <div className="flex flex-col items-end gap-1 text-right">
                <span className="text-[9px] font-mono" style={{ color: "rgba(167,139,250,0.6)" }}>NEURAL SYNC</span>
                <span className="text-[11px] font-black font-mono" style={{ color: "#a78bfa" }}>
                  {running ? `${doneCount}/${selectedList.filter(m => isModelAvailable(m)).length}` : `${TOP_FUSION_MODELS.length} READY`}
                </span>
                <div className="flex gap-1">
                  {["reasoning","coding","security","arabic"].map(c => (
                    <div key={c} className="w-1.5 h-1.5 rounded-full" style={{
                      background: c === "reasoning" ? "#a78bfa" : c === "coding" ? "#06b6d4" : c === "security" ? "#e21227" : "#fbbf24",
                      opacity: TOP_FUSION_MODELS.filter(m => m.category === c).length > 0 ? 1 : 0.3
                    }} />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">

              {/* Model Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4" style={{ color: "#a78bfa" }} />
                    <span className="text-[12px] font-black">اختيار النماذج</span>
                    <span className="text-[10px] text-muted-foreground">{selectedModels.size} مختار · {availableModels.length} متاح</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <button onClick={selectFreeOnly}
                      className="text-[9px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15 transition-colors">
                      المجاني فقط
                    </button>
                    <button onClick={selectAllAvailable}
                      className="text-[9px] font-bold px-2.5 py-1 rounded-lg bg-[#1a1a1a] text-muted-foreground border border-[#282828] hover:text-foreground transition-colors">
                      كل المتاح
                    </button>
                    <button onClick={() => setSelectedModels(new Set())}
                      className="text-[9px] font-bold px-2.5 py-1 rounded-lg bg-[#1a1a1a] text-muted-foreground border border-[#282828] hover:text-foreground transition-colors">
                      مسح الكل
                    </button>
                  </div>
                </div>

                {/* Category quick filters */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Filter className="w-3 h-3 text-muted-foreground" />
                  {[{ id: "all", label: "الكل" }, { id: "reasoning", label: "تفكير" }, { id: "coding", label: "كود" }, { id: "general", label: "عام" }, { id: "fast", label: "سريع" }, { id: "security", label: "أمن" }, { id: "arabic", label: "عربي" }, { id: "multimodal", label: "متعدد" }].map(c => (
                    <button key={c.id} onClick={() => setCatFilter(c.id)}
                      className={`text-[9px] font-bold px-2.5 py-1 rounded-full border transition-colors ${
                        catFilter === c.id ? "bg-[#a78bfa]/15 text-[#a78bfa] border-[#a78bfa]/30" : "bg-[#0d0d0d] border-[#1f1f1f] text-muted-foreground hover:text-foreground"
                      }`}>{c.label}</button>
                  ))}
                  <button onClick={() => selectByCategory(catFilter !== "all" ? catFilter : "reasoning")}
                    className="text-[9px] font-bold px-2.5 py-1 rounded-full bg-[#0d0d0d] border border-[#1f1f1f] text-muted-foreground hover:text-foreground transition-colors ml-1">
                    اختر هذه الفئة
                  </button>
                </div>

                {/* Model grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-52 overflow-y-auto pr-1">
                  {displayModels.map(model => {
                    const avail = isModelAvailable(model);
                    const selected = selectedModels.has(model.id);
                    return (
                      <button key={model.id} onClick={() => avail && toggleModel(model.id)}
                        disabled={!avail} title={!avail ? `يحتاج مفتاح API لـ ${model.providerName}` : ""}
                        className={`relative flex items-center gap-2 px-2.5 py-2 rounded-xl border text-left transition-all ${
                          !avail ? "opacity-35 cursor-not-allowed bg-[#0a0a0a] border-[#1a1a1a]"
                            : selected ? "border-opacity-60 bg-[#111]"
                            : "bg-[#0d0d0d] border-[#1a1a1a] hover:border-[#2a2a2a] hover:bg-[#111]"
                        }`}
                        style={selected ? { borderColor: model.color + "55" } : {}}>
                        {!avail && <Lock className="w-3 h-3 text-muted-foreground/40 absolute top-1 right-1.5" />}
                        {selected && (
                          <div className="absolute top-1 right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                            style={{ background: model.color + "30" }}>
                            <Check className="w-2.5 h-2.5" style={{ color: model.color }} />
                          </div>
                        )}
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: model.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-semibold truncate leading-tight">{model.label}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[8px] text-muted-foreground/50 truncate">{model.providerName}</span>
                            <span className={`text-[7px] font-bold px-1 py-0.5 rounded border leading-none ${COST_COLOR[model.costTag]}`}>{model.costTag}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {availableModels.length === 0 && (
                  <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-3 text-center">
                    <p className="text-[11px] text-amber-400 font-bold">لا توجد نماذج متاحة</p>
                    <p className="text-[10px] text-muted-foreground mt-1">أضف مفاتيح API في إعدادات الذكاء الاصطناعي. ابدأ مجاناً مع Groq على console.groq.com</p>
                  </div>
                )}
              </div>

              {/* Query Input */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-primary" />
                  <span className="text-[12px] font-black">الاستعلام</span>
                  <span className="text-[10px] text-muted-foreground">يُرسل لجميع النماذج المختارة في آنٍ واحد</span>
                </div>
                <textarea value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="اكتب سؤالك هنا..."
                  rows={3}
                  className="w-full bg-[#0d0d0d] border border-[#1f1f1f] focus:border-[rgba(167,139,250,0.4)] rounded-xl px-4 py-3 text-[12px] outline-none resize-none placeholder:text-muted-foreground/30 transition-colors"
                />
              </div>

              {/* Action Row */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {running ? (
                  <button onClick={stopAll}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border font-black text-[12px] transition-all"
                    style={{ background: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.4)", color: "#ef4444" }}>
                    <Square className="w-3.5 h-3.5 fill-current" /> إيقاف الكل
                  </button>
                ) : (
                  <button onClick={runFusion}
                    disabled={selectedList.filter(m => isModelAvailable(m)).length === 0 || !query.trim()}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[12px] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: "linear-gradient(135deg,#a78bfa,#7c3aed)", color: "white", boxShadow: selectedList.filter(m => isModelAvailable(m)).length > 0 ? "0 0 25px rgba(167,139,250,0.35)" : "none" }}>
                    <Zap className="w-4 h-4" />
                    RUN HYPER FUSION
                    <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono">
                      {selectedList.filter(m => isModelAvailable(m)).length} نموذج
                    </span>
                  </button>
                )}
                {results.length > 0 && !running && successCount >= 2 && (
                  <button onClick={runSynthesis} disabled={synthStreaming}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-[11px] transition-all disabled:opacity-60"
                    style={{ background: "rgba(251,191,36,0.1)", borderColor: "rgba(251,191,36,0.4)", color: "#fbbf24" }}>
                    {synthStreaming ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    مزج النتائج (SYNTHESIS)
                  </button>
                )}
                {!running && results.length > 0 && (
                  <button onClick={() => { setResults([]); setSynthesis(""); }}
                    className="px-3 py-2.5 rounded-xl border text-[10px] font-bold text-muted-foreground border-[#2a2a2a] hover:text-foreground transition-colors">
                    مسح النتائج
                  </button>
                )}
              </div>

              {/* Progress */}
              {running && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>التقدم: {doneCount} / {selectedList.filter(m => isModelAvailable(m)).length} نموذج</span>
                    <span>{Math.round((doneCount / Math.max(selectedList.filter(m => isModelAvailable(m)).length, 1)) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg,#a78bfa,#7c3aed)" }}
                      animate={{ width: `${(doneCount / Math.max(selectedList.filter(m => isModelAvailable(m)).length, 1)) * 100}%` }}
                      transition={{ duration: 0.3 }} />
                  </div>
                </div>
              )}

              {/* Results */}
              {results.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400/30" />
                    <span className="text-[12px] font-black">نتائج النماذج</span>
                    <span className="text-[10px] text-emerald-400">{successCount} مكتمل</span>
                    {results.some(r => r.status === "error") && (
                      <span className="text-[10px] text-red-400">{results.filter(r => r.status === "error").length} خطأ</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {results.map((result) => {
                      const isExpanded = expandedModels.has(result.modelId);
                      return (
                        <motion.div key={result.modelId} layout
                          className="rounded-xl border overflow-hidden"
                          style={{ borderColor: result.color + "30", background: "rgba(0,0,0,0.5)" }}>
                          <div className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer select-none"
                            onClick={() => setExpandedModels(prev => { const n = new Set(prev); if (n.has(result.modelId)) n.delete(result.modelId); else n.add(result.modelId); return n; })}>
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: result.color }} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-bold">{result.label}</span>
                                <span className="text-[9px] text-muted-foreground/50">{result.providerName}</span>
                                {result.status === "streaming" && (
                                  <span className="flex items-center gap-1 text-[9px] animate-pulse font-mono" style={{ color: result.color }}>
                                    <Play className="w-2.5 h-2.5 fill-current" /> يكتب...
                                  </span>
                                )}
                                {result.status === "done" && <span className="text-[9px] text-emerald-400 font-semibold">مكتمل</span>}
                                {result.status === "error" && <span className="text-[9px] text-red-400 font-semibold">خطأ</span>}
                              </div>
                              {!isExpanded && result.content && (
                                <p className="text-[10px] text-muted-foreground truncate mt-0.5">{result.content.slice(0, 90)}...</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {result.content && (
                                <button onClick={(e) => { e.stopPropagation(); copyText(result.content, result.modelId); }}
                                  className="p-1.5 rounded-lg hover:bg-[#1f1f1f] text-muted-foreground hover:text-foreground transition-colors">
                                  {copiedId === result.modelId ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              )}
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                            </div>
                          </div>
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                                <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: result.color + "20" }}>
                                  {result.status === "error" ? (
                                    <p className="text-[11px] text-red-400 font-mono leading-relaxed">{result.error}</p>
                                  ) : (
                                    <pre className="text-[11px] text-foreground/90 whitespace-pre-wrap leading-relaxed font-sans">{result.content}</pre>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Synthesis output */}
              {(synthesis || synthStreaming) && (
                <div className="rounded-xl border overflow-hidden"
                  style={{ borderColor: "rgba(251,191,36,0.45)", background: "rgba(251,191,36,0.04)" }}>
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-[12px] font-black text-amber-400">SYNTHESIS — مزج ذكي لجميع النتائج</span>
                    {synthStreaming && <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin ml-auto" />}
                    {!synthStreaming && synthesis && (
                      <button onClick={() => copyText(synthesis, "synthesis")} className="ml-auto p-1.5 rounded-lg hover:bg-[#1f1f1f] text-muted-foreground hover:text-foreground transition-colors">
                        {copiedId === "synthesis" ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                  <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: "rgba(251,191,36,0.2)" }}>
                    <pre className="text-[11px] text-foreground/90 whitespace-pre-wrap leading-relaxed font-sans">{synthesis}</pre>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t flex items-center justify-between shrink-0" style={{ borderColor: "rgba(167,139,250,0.2)" }}>
              <span className="text-[10px] text-muted-foreground">
                {availableModels.length} متاح · {TOP_FUSION_MODELS.filter(m => m.costTag === "free").length} مجاني · مستقل عن Council
              </span>
              <button onClick={onClose} className="px-5 py-2 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-white text-[12px] font-bold hover:bg-[#222] transition-colors">
                إغلاق
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
