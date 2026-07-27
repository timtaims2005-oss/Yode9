import type { JsonValue } from "../../types";

export type MemoryItem = { id: string; content: string; timestamp: number; metadata?: Record<string, JsonValue> };
export class WorkingMemoryManager {
  private items: MemoryItem[] = [];
  constructor(private readonly maxItems = 20) {}
  add(item: MemoryItem): void { this.items = [...this.items, item].slice(-this.maxItems); }
  compress(): string { return this.items.map((item) => item.content).join("\n").slice(-4000); }
  snapshot(): MemoryItem[] { return [...this.items]; }
}

export class EpisodicMemoryLedger {
  private readonly entries: MemoryItem[] = [];
  append(entry: MemoryItem): void { this.entries.push(Object.freeze({ ...entry })); }
  entriesSince(timestamp = 0): MemoryItem[] { return this.entries.filter((entry) => entry.timestamp >= timestamp); }
  size(): number { return this.entries.length; }
}

export type KnowledgeTriple = { subject: string; predicate: string; object: string };
export class SemanticKnowledgeGraph {
  private readonly triples: KnowledgeTriple[] = [];
  add(triple: KnowledgeTriple): void { this.triples.push(triple); }
  search(term: string): KnowledgeTriple[] { return this.triples.filter((item) => Object.values(item).some((value) => value.toLowerCase().includes(term.toLowerCase()))); }
  snapshot(): KnowledgeTriple[] { return [...this.triples]; }
}

export type ProceduralRecipe = { id: string; name: string; steps: string[]; verified: boolean; version: string };
export class ProceduralSkillStore {
  private readonly recipes = new Map<string, ProceduralRecipe>();
  save(recipe: ProceduralRecipe): void { if (recipe.verified) this.recipes.set(recipe.id, { ...recipe }); }
  getVerified(): ProceduralRecipe[] { return [...this.recipes.values()]; }
}