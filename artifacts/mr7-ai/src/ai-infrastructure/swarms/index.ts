export type SwarmRole = "coder" | "auditor" | "red-teamer" | "financial-reviewer" | "planner" | "custom";
export type SwarmAgent = { id: string; role: SwarmRole; evaluate(input: string): Promise<AgentVote> };
export type AgentVote = { agentId: string; decision: string; confidence: number; rationale: string; risks: string[] };
export type ConsensusResult = { decision: string; confidence: number; votes: AgentVote[]; dissent: AgentVote[]; iterations: number };
export type Payoff = { action: string; payoff: number; vulnerabilities: string[]; rivalStrategy?: string };

export class GameTheoreticTree {
  evaluate(actions: Payoff[], iterations = 3): Payoff | undefined {
    if (!actions.length) return undefined;
    return [...actions].sort((a, b) => (b.payoff - b.vulnerabilities.length * 0.1) - (a.payoff - a.vulnerabilities.length * 0.1))[0];
  }
}

export class SwarmOrchestrator {
  constructor(private readonly agents: SwarmAgent[], private readonly maxIterations = 3) {}
  async reachConsensus(input: string): Promise<ConsensusResult> {
    let votes: AgentVote[] = [];
    for (let iteration = 1; iteration <= this.maxIterations; iteration++) {
      votes = await Promise.all(this.agents.map((agent) => agent.evaluate(input)));
      const grouped = new Map<string, AgentVote[]>();
      votes.forEach((vote) => grouped.set(vote.decision, [...(grouped.get(vote.decision) ?? []), vote]));
      const winner = [...grouped.entries()].sort((a, b) => b[1].length - a[1].length || average(b[1]) - average(a[1]))[0];
      if (winner && winner[1].length > votes.length / 2) {
        return { decision: winner[0], confidence: average(winner[1]), votes, dissent: votes.filter((vote) => vote.decision !== winner[0]), iterations: iteration };
      }
    }
    const best = [...votes].sort((a, b) => b.confidence - a.confidence)[0];
    return { decision: best?.decision ?? "no-consensus", confidence: best?.confidence ?? 0, votes, dissent: votes.filter((vote) => vote !== best), iterations: this.maxIterations };
  }
}

function average(votes: AgentVote[]): number {
  return votes.length ? votes.reduce((sum, vote) => sum + vote.confidence, 0) / votes.length : 0;
}
