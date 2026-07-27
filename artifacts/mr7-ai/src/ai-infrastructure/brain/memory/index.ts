import type { JsonValue } from "../../types";

export type EpisodicRecord = {
  id: string;
  type: "action" | "failure" | "retrospective";
  content: string;
  timestamp: number;
  metadata?: Record<string, JsonValue>;
};
export type KnowledgeNode = { id: string; label: string; properties?: Record<string, JsonValue> };
export type KnowledgeEdge = { from: string; to: string; relation: string };
export type ProceduralSkill = { id: string; name: string; code: string; verified: boolean; version: string };

export class EpisodicMemory {
  private readonly records: EpisodicRecord[] = [];
  append(record: EpisodicRecord): void { this.records.push(record); }
  recent(limit = 20): EpisodicRecord[] { return this.records.slice(-limit); }
  search(query: string): EpisodicRecord[] {
    return this.records.filter((record) => record.content.toLowerCase().includes(query.toLowerCase()));
  }
}

export class SemanticKnowledgeGraph {
  private readonly nodes = new Map<string, KnowledgeNode>();
  private readonly edges: KnowledgeEdge[] = [];
  addNode(node: KnowledgeNode): void { this.nodes.set(node.id, node); }
  addEdge(edge: KnowledgeEdge): void { this.edges.push(edge); }
  neighbors(id: string): KnowledgeNode[] {
    const ids = this.edges.filter((edge) => edge.from === id).map((edge) => edge.to);
    return ids.map((nodeId) => this.nodes.get(nodeId)).filter((node): node is KnowledgeNode => Boolean(node));
  }
  snapshot(): { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] } {
    return { nodes: [...this.nodes.values()], edges: [...this.edges] };
  }
}

export class ProceduralMemory {
  private readonly skills = new Map<string, ProceduralSkill>();
  save(skill: ProceduralSkill): void { this.skills.set(skill.id, skill); }
  getVerified(): ProceduralSkill[] { return [...this.skills.values()].filter((skill) => skill.verified); }
  get(id: string): ProceduralSkill | undefined { return this.skills.get(id); }
}
