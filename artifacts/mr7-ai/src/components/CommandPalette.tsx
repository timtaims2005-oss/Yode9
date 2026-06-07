import { useEffect } from "react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useStore } from "@/lib/store";
import { MessageSquare, Settings, Crown, KeyRound, Plus, Bell, Keyboard, LayoutGrid, UserCog } from "lucide-react";
import { AI_MODELS, PERSONAS } from "@/lib/ai-config";

export function CommandPalette({
  open,
  onOpenChange,
  onAction,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAction: (action: string, payload?: string) => void;
}) {
  const { state } = useStore();

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search chats..." />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => onAction("new-chat")}>
            <Plus className="w-4 h-4" /> New chat
          </CommandItem>
          <CommandItem onSelect={() => onAction("open-pricing")}>
            <Crown className="w-4 h-4" /> Upgrade plan
          </CommandItem>
          <CommandItem onSelect={() => onAction("open-api")}>
            <KeyRound className="w-4 h-4" /> API access
          </CommandItem>
          <CommandItem onSelect={() => onAction("open-settings")}>
            <Settings className="w-4 h-4" /> Settings
          </CommandItem>
          <CommandItem onSelect={() => onAction("open-notifications")}>
            <Bell className="w-4 h-4" /> Notifications
          </CommandItem>
          <CommandItem onSelect={() => onAction("open-shortcuts")}>
            <Keyboard className="w-4 h-4" /> Keyboard shortcuts
          </CommandItem>
          <CommandItem onSelect={() => onAction("open-tools")}>
            <LayoutGrid className="w-4 h-4 text-emerald-400" /> Open Tools Hub
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading={`Models (${AI_MODELS.length})`}>
          {AI_MODELS.map((m) => {
            const Icon = m.icon;
            return (
              <CommandItem key={m.id} value={`model ${m.id} ${m.desc}`} onSelect={() => onAction("set-model", m.id)}>
                <Icon className={`w-4 h-4 ${m.color}`} />
                <span className="truncate">{m.id}</span>
                {state.activeModel === m.id && <span className="ml-auto text-[10px] text-primary font-bold">ACTIVE</span>}
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandGroup heading={`Personas (${PERSONAS.length})`}>
          <CommandItem onSelect={() => onAction("set-persona", "")}>
            <UserCog className="w-4 h-4" />
            <span>Clear persona</span>
            {!state.activePersona && <span className="ml-auto text-[10px] text-primary font-bold">ACTIVE</span>}
          </CommandItem>
          {PERSONAS.map((p) => {
            const Icon = p.icon;
            return (
              <CommandItem key={p.id} value={`persona ${p.id} ${p.desc}`} onSelect={() => onAction("set-persona", p.id)}>
                <Icon className={`w-4 h-4 ${p.color}`} />
                <span className="truncate">{p.id}</span>
                {state.activePersona === p.id && <span className="ml-auto text-[10px] text-primary font-bold">ACTIVE</span>}
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandGroup heading="Chats">
          {state.chats.slice(0, 8).map((c) => (
            <CommandItem key={c.id} onSelect={() => onAction("select-chat", c.id)}>
              <MessageSquare className="w-4 h-4" />
              <span className="truncate">{c.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
