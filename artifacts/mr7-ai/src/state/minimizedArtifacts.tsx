/**
 * Global store for minimized ArtifactPage overlays.
 * Lets the pill bubbles survive across chat scrolling and route changes.
 */
import { createContext, useContext, useState, type ReactNode } from "react";

// Inlined to avoid circular dependency with ArtifactPanel-v3
type ArtifactLanguage = "html" | "react" | "javascript";

export interface MinimizedArtifact {
  artifactId: string;
  title: string;
  language: ArtifactLanguage;
  editCode: string;
  view: "preview" | "code" | "split";
}

interface MinimizedArtifactsCtx {
  minimized: MinimizedArtifact[];
  minimize: (artifact: MinimizedArtifact) => void;
  remove:   (artifactId: string) => void;
}

const Ctx = createContext<MinimizedArtifactsCtx | null>(null);

export function MinimizedArtifactsProvider({ children }: { children: ReactNode }) {
  const [minimized, setMinimized] = useState<MinimizedArtifact[]>([]);

  const minimize = (artifact: MinimizedArtifact) => {
    setMinimized(prev => {
      // Replace if same id (re-minimize with updated state)
      const filtered = prev.filter(a => a.artifactId !== artifact.artifactId);
      return [...filtered, artifact];
    });
  };

  const remove = (artifactId: string) => {
    setMinimized(prev => prev.filter(a => a.artifactId !== artifactId));
  };

  return (
    <Ctx.Provider value={{ minimized, minimize, remove }}>
      {children}
    </Ctx.Provider>
  );
}

export function useMinimizedArtifacts(): MinimizedArtifactsCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMinimizedArtifacts must be inside MinimizedArtifactsProvider");
  return ctx;
}
