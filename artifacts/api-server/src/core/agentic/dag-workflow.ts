import type {
  WorkflowContext,
  WorkflowDefinition,
  WorkflowNode,
  WorkflowNodeResult,
} from "./types";
import { assessRequestSafety } from "./safety";

export interface WorkflowRunResult {
  readonly workflowId: string;
  readonly status: "completed" | "blocked" | "failed";
  readonly nodes: readonly WorkflowNodeResult[];
}

/**
 * Dependency-aware workflow runner. Nodes are run in deterministic waves and
 * only receive in-memory context. A malformed graph is rejected before work.
 */
export class DagWorkflowEngine {
  async run(definition: WorkflowDefinition, context: WorkflowContext): Promise<WorkflowRunResult> {
    const graph = new Map<string, WorkflowNode>();
    for (const node of definition.nodes) {
      if (graph.has(node.id)) throw new Error(`Duplicate workflow node: ${node.id}`);
      graph.set(node.id, node);
    }
    for (const node of definition.nodes) {
      for (const dependency of node.dependsOn) {
        if (!graph.has(dependency)) throw new Error(`Unknown workflow dependency: ${dependency}`);
      }
    }
    this.assertAcyclic(definition.nodes, graph);

    const safety = assessRequestSafety(context.request);
    if (!safety.allowed) {
      return {
        workflowId: definition.id,
        status: "blocked",
        nodes: [{
          nodeId: "safety",
          status: "blocked",
          output: null,
          reason: safety.reason,
        }],
      };
    }

    const completed = new Set<string>();
    const results: WorkflowNodeResult[] = [];
    while (completed.size < definition.nodes.length) {
      const ready = definition.nodes.filter((node) =>
        !completed.has(node.id) && node.dependsOn.every((dependency) => completed.has(dependency)),
      );
      if (ready.length === 0) throw new Error(`Workflow "${definition.id}" could not make progress`);
      const wave = await Promise.all(ready.map((node) => node.execute(context)));
      for (const result of wave) {
        results.push(result);
        completed.add(result.nodeId);
        context.values.set(result.nodeId, result.output);
      }
      if (wave.some((result) => result.status === "failed")) {
        return { workflowId: definition.id, status: "failed", nodes: results };
      }
    }
    return { workflowId: definition.id, status: "completed", nodes: results };
  }

  private assertAcyclic(nodes: readonly WorkflowNode[], graph: ReadonlyMap<string, WorkflowNode>): void {
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const visit = (id: string): void => {
      if (visiting.has(id)) throw new Error(`Workflow cycle detected at node: ${id}`);
      if (visited.has(id)) return;
      visiting.add(id);
      const node = graph.get(id);
      if (node !== undefined) for (const dependency of node.dependsOn) visit(dependency);
      visiting.delete(id);
      visited.add(id);
    };
    for (const node of nodes) visit(node.id);
  }
}

export { DagWorkflowEngine as DAGWorkflowEngine };
export default DagWorkflowEngine;
