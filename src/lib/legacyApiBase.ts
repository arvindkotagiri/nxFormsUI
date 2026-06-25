const DEFAULT_NODE_API = "http://localhost:4000";

function normalizeLegacyBase(raw: string): string {
  // Accept both "http://host:port" and "http://host:port/api" in env config.
  return String(raw).replace(/\/api\/?$/, "").replace(/\/$/, "");
}

/** Node backend hosts /api/catalog, /api/preview-data, etc. Prefer VITE_NODE_API over VITE_FLASK_API. */
export function getLegacyApiBase(): string {
  const nodeApi = import.meta.env.VITE_NODE_API;
  if (nodeApi) {
    return normalizeLegacyBase(nodeApi);
  }

  if (import.meta.env.DEV) {
    return "";
  }

  const flaskApi = import.meta.env.VITE_FLASK_API;
  if (flaskApi) {
    return normalizeLegacyBase(flaskApi);
  }

  return DEFAULT_NODE_API;
}

export function legacyApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const base = getLegacyApiBase();
  return base ? `${base}${normalizedPath}` : normalizedPath;
}

export async function parseJsonResponse<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  const trimmed = text.trimStart();

  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html") || trimmed.includes("Cannot POST") || trimmed.includes("Cannot GET")) {
    throw new Error(
      `Backend route not found (${res.status}). Ensure nxFormsNode is running (default http://localhost:4000) and set VITE_NODE_API in your .env (without trailing /api). Response: ${text.slice(0, 120)}`,
    );
  }

  if (!text) {
    return null as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON response: ${text.slice(0, 120)}`);
  }
}

export async function fetchLegacyApi<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(legacyApiUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  const data = await parseJsonResponse<T>(res);

  if (!res.ok) {
    const message =
      (data as { message?: string })?.message ||
      (data as { error?: string })?.error ||
      (data as { detail?: string })?.detail ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data;
}
