let _csrfToken: string | null = null;
let _fetching: Promise<string> | null = null;

export async function getCsrfToken(): Promise<string> {
  if (_csrfToken) return _csrfToken;
  if (_fetching) return _fetching;

  _fetching = fetch("/api/csrf-token", { credentials: "include" })
    .then(async (r) => {
      if (!r.ok) throw new Error("CSRF fetch failed");
      const data = (await r.json()) as { csrfToken: string };
      _csrfToken = data.csrfToken;
      _fetching = null;
      return _csrfToken;
    })
    .catch(() => {
      _fetching = null;
      return "";
    });

  return _fetching;
}

export function invalidateCsrfToken(): void {
  _csrfToken = null;
  _fetching = null;
}
