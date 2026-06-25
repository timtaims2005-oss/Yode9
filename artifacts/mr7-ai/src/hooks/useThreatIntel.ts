import { useQuery } from "@tanstack/react-query";

export interface ThreatStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  avgScore: number;
  topCategory: string;
  blockedLast24h: number;
}

export interface ThreatEvent {
  id: string;
  timestamp: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  summary: string;
  indicators: string[];
  score: number;
  blocked: boolean;
  sourceIp?: string;
  destIp?: string;
}

export function useThreatStats() {
  return useQuery<ThreatStats>({
    queryKey: ["threat-intel", "stats"],
    queryFn: () => fetch("/api/threat-intel/stats").then(r => {
      if (!r.ok) throw new Error("failed to fetch threat stats");
      return r.json();
    }),
    refetchInterval: 5000,
    staleTime: 3000,
    retry: 2,
    placeholderData: {
      total: 247, critical: 3, high: 12, medium: 45,
      low: 187, avgScore: 34, topCategory: "malware", blockedLast24h: 1293,
    },
  });
}

export function useThreatEvents(limit = 50) {
  return useQuery<ThreatEvent[]>({
    queryKey: ["threat-intel", "events", limit],
    queryFn: () => fetch(`/api/threat-intel/events?limit=${limit}`).then(r => {
      if (!r.ok) throw new Error("failed to fetch events");
      return r.json();
    }),
    refetchInterval: 8000,
    staleTime: 5000,
    retry: 1,
    placeholderData: [],
  });
}

export function useTopThreats(limit = 10) {
  return useQuery({
    queryKey: ["threat-intel", "top", limit],
    queryFn: () => fetch(`/api/threat-intel/top?limit=${limit}`).then(r => {
      if (!r.ok) throw new Error("failed to fetch top threats");
      return r.json();
    }),
    refetchInterval: 10000,
    staleTime: 8000,
    retry: 1,
    placeholderData: [],
  });
}
