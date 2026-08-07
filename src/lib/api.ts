import { getLegacyApiBase, parseJsonResponse } from "./legacyApiBase";

function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const base = getLegacyApiBase();
  return base ? `${base}${normalizedPath}` : normalizedPath;
}

function getToken() {
  return localStorage.getItem("access_token");
}

function setToken(token: string) {
  localStorage.setItem("access_token", token);
}

let bootstrappingPromise: Promise<void> | null = null;

// DEV ONLY: store in .env (Vite exposes VITE_* vars)
const DEV_EMAIL = import.meta.env.VITE_DEV_EMAIL;
const DEV_PASSWORD = import.meta.env.VITE_DEV_PASSWORD;

// Helper: check if a JWT is expired (client-side, no secret needed)
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    // `exp` is in seconds; Date.now() is in ms
    return payload.exp * 1000 < Date.now();
  } catch {
    return true; // treat malformed token as expired
  }
}

// Force a fresh login and store the new token
async function refreshToken(): Promise<void> {
  if (!DEV_EMAIL || !DEV_PASSWORD) {
    throw new Error("Missing VITE_DEV_EMAIL / VITE_DEV_PASSWORD in .env");
  }
  const res = await fetch(apiUrl("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: DEV_EMAIL, password: DEV_PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || "Re-login failed");
  setToken(data.access_token);
  localStorage.setItem("user", JSON.stringify(data.user));
}

export async function bootstrapTokenIfMissing() {
  const token = getToken();

  // ✅ Also re-login if the stored token is expired
  if (token && !isTokenExpired(token)) return;

  if (!bootstrappingPromise) {
    bootstrappingPromise = refreshToken().finally(() => {
      bootstrappingPromise = null;
    });
  }

  return bootstrappingPromise;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  await bootstrapTokenIfMissing();

  const buildHeaders = (): Record<string, string> => ({
    "Content-Type": "application/json",
    ...(options.headers as any),
    ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
  });

  const url = apiUrl(path);
  const res = await fetch(url, { ...options, headers: buildHeaders() });

  // If the server says 401, force a token refresh and retry ONCE
  if (res.status === 401) {
    await refreshToken();
    const retryRes = await fetch(url, { ...options, headers: buildHeaders() });
    const retryData = await parseJsonResponse<T>(retryRes);
    if (!retryRes.ok) {
      const message =
        (retryData as { detail?: string })?.detail ||
        (retryData as { message?: string })?.message ||
        "Request failed after token refresh";
      throw new Error(typeof message === "string" ? message : "Request failed after token refresh");
    }
    return retryData;
  }

  const data = await parseJsonResponse<T>(res);
  if (!res.ok) {
    const message =
      (data as { detail?: string })?.detail ||
      (data as { message?: string })?.message ||
      `Request failed (${res.status})`;
    throw new Error(typeof message === "string" ? message : `Request failed (${res.status})`);
  }
  return data;
}

// Auth
export async function login(email: string, password: string) {
  const data = await request<{ access_token: string; user: any }>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
  );
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("user", JSON.stringify(data.user));
  return data;
}

export async function me() {
  return request("/auth/me");
}

export async function getCatalog() {
  return request<any[]>("/api/catalog");
}

// Dashboard configs
export async function getLabelConfigs(filters: Record<string, any> = {}) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "" || v === "all") return;
    qs.set(k, String(v));
  });
  const q = qs.toString() ? `?${qs.toString()}` : "";
  return request<any[]>(`/api/label-configs${q}`);
}

export async function createLabelConfig(payload: any) {
  return request(`/api/label-configs`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteLabelConfig(id: string) {
  return request(`/api/label-configs/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// Determination
type DeterminationResult = {
  match_count: number;
  labels: Array<{
    label_name: string;
    label_id: string;
    number_of_labels: number;
    priority: number;
  }>;
};

export async function determineLabels(
  payload: Record<string, any>,
): Promise<DeterminationResult> {
  return request<DeterminationResult>(`/label-determination`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getLabelConfig(id: string) {
  try {
    return await request<any>(`/api/label-configs/${encodeURIComponent(id)}`);
  } catch (primaryError) {
    const configs = await getLabelConfigs();
    const match = configs.find((config) => String(config.config_id) === String(id));
    if (match) return match;
    throw primaryError;
  }
}

export async function updateLabelConfig(id: string, payload: any) {
  return request(`/api/label-configs/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// Reference
export const getCustomers = () => request<any[]>(`/reference/customers`);
export const getPlants = () => request<any[]>(`/reference/plants`);
export const getWarehouses = () => request<any[]>(`/reference/warehouses`);
export const getProcessTypes = () => request<any[]>(`/reference/process-types`);
// export const getLabels = () => request<any[]>(`/reference/labels`);
export const getLabels = () => request<any[]>(`/reference/all-labels`);
export const getPrinters = () => request<any[]>(`/reference/printers`);

export const getCompanyCodes = () => request<any[]>(`/reference/company-codes`);
export const getSalesOrgs = () => request<any[]>(`/reference/sales-orgs`);
export const getShippingPoints = () =>
  request<any[]>(`/reference/shipping-points`);
