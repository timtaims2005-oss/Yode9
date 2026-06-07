import { Sparkles, Code2, Languages, BookOpen, Megaphone, Calculator } from "lucide-react";

export const QUICK_PROMPTS: { icon: React.ElementType; label: string; prompt: string }[] = [
  { icon: Sparkles, label: "Brainstorm 10 startup ideas", prompt: "Brainstorm 10 startup ideas in the AI productivity space, ranked by realism and TAM." },
  { icon: Code2, label: "Write a Python script", prompt: "Write a clean Python script that fetches a JSON API and saves the results to a CSV." },
  { icon: BookOpen, label: "Explain a concept simply", prompt: "Explain how transformer models work, in simple language a high-school student can follow." },
  { icon: Megaphone, label: "Write a landing page hero", prompt: "Write a punchy landing page hero (headline, subheadline, CTA) for a productivity SaaS." },
  { icon: Languages, label: "Translate to French", prompt: "Translate the following text to natural, fluent French:" },
  { icon: Calculator, label: "Plan a 7-day trip", prompt: "Plan a detailed 7-day trip to Tokyo for a first-time visitor with a moderate budget." },
];

export function QuickPrompts({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="w-full overflow-x-auto -mx-4 px-4 pb-1">
      <div className="flex gap-2 min-w-min">
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p.label}
            onClick={() => onPick(p.prompt)}
            className="flex-shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-full bg-card border border-border hover:border-primary/40 hover:bg-accent transition-colors text-[12px] text-foreground/90"
          >
            <p.icon className="w-3.5 h-3.5 text-primary" />
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
