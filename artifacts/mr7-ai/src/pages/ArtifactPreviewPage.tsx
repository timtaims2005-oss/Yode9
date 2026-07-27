import { useEffect, useState } from "react";
import { buildIframeDoc } from "../components/ArtifactPanel";

/**
 * Fullscreen artifact preview, opened in a new tab from the Artifact panel.
 *
 * SECURITY: this page itself is trusted app code running at our origin, but
 * the artifact's generated code is UNTRUSTED (model output). It is rendered
 * inside a sandboxed iframe with `sandbox="allow-scripts"` only — no
 * `allow-same-origin` — which gives it an opaque, unique origin with no
 * access to our app's cookies, localStorage, or session. The code is passed
 * via a base64 query param rather than a same-origin blob: URL, which would
 * otherwise let untrusted script run in a top-level document inheriting our
 * app's origin.
 */
export default function ArtifactPreviewPage() {
  const [doc, setDoc] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const b64 = params.get("code");
    const lang = params.get("lang") ?? "html";
    if (!b64) { setNotFound(true); return; }
    try {
      const code = decodeURIComponent(escape(atob(b64)));
      setDoc(buildIframeDoc(code, lang));
    } catch {
      setNotFound(true);
    }
  }, []);

  if (notFound) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a0a0a", color: "#e5e7eb", fontFamily: "sans-serif" }}>
        Preview expired or unavailable — reopen it from the artifact panel.
      </div>
    );
  }
  if (!doc) return null;

  return (
    <iframe
      title="Artifact fullscreen preview"
      srcDoc={doc}
      sandbox="allow-scripts"
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", border: "none", background: "#0a0a0a" }}
    />
  );
}
