import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Moon, Check, Palette } from "lucide-react";
import { useStore, ACCENT_OPTIONS } from "@/lib/store";

export function ThemePopover() {
  const { state, dispatch } = useStore();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-accent transition-colors"
          aria-label="Theme"
        >
          <Moon className="w-5 h-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2 bg-card border-border">
        <div className="px-1 pt-0.5 pb-2 text-[11px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
          <Palette className="w-3 h-3" /> Accent color
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {ACCENT_OPTIONS.map((a) => (
            <button
              key={a.id}
              onClick={() => dispatch({ type: "SET_ACCENT", accent: a.id })}
              className={`relative aspect-square rounded-lg border transition-all ${state.themeAccent === a.id ? "border-foreground scale-105" : "border-border hover:scale-105"}`}
              title={a.label}
              aria-label={a.label}
            >
              <span className={`absolute inset-1 rounded-md ${a.swatch}`} />
              {state.themeAccent === a.id && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" />
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="mt-2 px-1 text-[10px] text-muted-foreground capitalize">{state.themeAccent}</div>
      </PopoverContent>
    </Popover>
  );
}
