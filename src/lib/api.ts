const API_URL = import.meta.env.VITE_NODE_API;

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

export async function bootstrapTokenIfMissing() {
  const token = getToken();
  if (token) return;

  // Prevent multiple parallel logins from different API calls
  if (!bootstrappingPromise) {
    bootstrappingPromise = (async () => {
      if (!DEV_EMAIL || !DEV_PASSWORD) {
        throw new Error(
          "No access_token found and missing VITE_DEV_EMAIL / VITE_DEV_PASSWORD in .env"
        );
      }

      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: DEV_EMAIL, password: DEV_PASSWORD }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Dev login failed");

      setToken(data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
    })().finally(() => {
      bootstrappingPromise = null;
    });
  }

  return bootstrappingPromise;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  // Auto-login once if missing token (DEV convenience)
  await bootstrapTokenIfMissing();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as any),
  };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg = data?.detail || data?.message || "Request failed";
    throw new Error(msg);
  }

  return data as T;
}

// Auth
export async function login(email: string, password: string) {
  const data = await request<{ access_token: string; user: any }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("user", JSON.stringify(data.user));
  return data;
}

export async function me() {
  return request("/auth/me");
}

// Dashboard configs
export async function getLabelConfigs(filters: Record<string, any> = {}) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "" || v === "all") return;
    qs.set(k, String(v));
  });
  const q = qs.toString() ? `?${qs.toString()}` : "";
  return request<any[]>(`/label-configs${q}`);
}

export async function createLabelConfig(payload: any) {
  return request(`/label-configs`, { method: "POST", body: JSON.stringify(payload) });
}

export async function deleteLabelConfig(id: string) {
  return request(`/label-configs/${id}`, {
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
  payload: Record<string, any>
): Promise<DeterminationResult> {
  return request<DeterminationResult>(`/label-determination`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}


export async function getLabelConfig(id: string) {
  return request<any>(`/label-configs/${id}`);
}

export async function updateLabelConfig(id: string, payload: any) {
  return request(`/label-configs/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

// Reference
export const getCustomers = () => request<any[]>(`/reference/customers`);
export const getPlants = () => request<any[]>(`/reference/plants`);
export const getWarehouses = () => request<any[]>(`/reference/warehouses`);
export const getProcessTypes = () => request<any[]>(`/reference/process-types`);
export const getLabels = () => request<any[]>(`/reference/labels`);
// export const getPrinters = () => request<any[]>(`/reference/printers`);
export const getPrinters = () => {return [ {
        "id": "PRT001",
        "name": "Printer 01",
        "description": "Printer in Warehouse A"
    },
    {
        "id": "PRT002",
        "name": "Printer 02",
        "description": "Printer in Warehouse B"
    },
    {
        "id": "PRT003",
        "name": "Printer 03",
        "description": "Printer in Warehouse C"
    },]};


export const getCompanyCodes = () => request<any[]>(`/reference/company-codes`);
export const getSalesOrgs = () => request<any[]>(`/reference/sales-orgs`);
export const getShippingPoints = () => request<any[]>(`/reference/shipping-points`);