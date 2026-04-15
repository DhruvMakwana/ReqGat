import { getToken } from "./auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail || res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const api = {
  auth: {
    register: (body: { tenant_name: string; full_name: string; email: string; password: string }) =>
      request<AuthToken>("/auth/register", { method: "POST", body: JSON.stringify(body) }),
    login: (body: { email: string; password: string }) =>
      request<AuthToken>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
    me: () => request<UserOut>("/auth/me"),
  },

  // ── Settings ────────────────────────────────────────────────────────────────
  settings: {
    get: () => request<TenantOut>("/settings/tenant"),
    update: (body: { ai_provider?: string; api_key_claude?: string; api_key_openai?: string }) =>
      request<TenantOut>("/settings/tenant", { method: "PUT", body: JSON.stringify(body) }),
  },

  // ── Projects ────────────────────────────────────────────────────────────────
  projects: {
    list: () => request<ProjectOut[]>("/projects"),
    create: (body: { name: string; domain_type: string; description?: string }) =>
      request<ProjectOut>("/projects", { method: "POST", body: JSON.stringify(body) }),
    get: (id: string) => request<ProjectOut>(`/projects/${id}`),
    update: (id: string, body: { name?: string; description?: string }) =>
      request<ProjectOut>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    delete: (id: string) => request<void>(`/projects/${id}`, { method: "DELETE" }),
  },

  // ── Discovery ───────────────────────────────────────────────────────────────
  discovery: {
    analyze: (projectId: string, free_text: string) =>
      request<DiscoveryResult>(`/projects/${projectId}/discovery/analyze`, {
        method: "POST",
        body: JSON.stringify({ free_text }),
      }),
    save: (projectId: string, items: DiscoveryItem[]) =>
      request<RequirementOut[]>(`/projects/${projectId}/discovery/save`, {
        method: "POST",
        body: JSON.stringify({ items }),
      }),
  },

  // ── Requirements ─────────────────────────────────────────────────────────────
  requirements: {
    list: (projectId: string) => request<RequirementOut[]>(`/projects/${projectId}/requirements`),
    create: (projectId: string, body: { title: string; category: string; description?: string; priority?: string }) =>
      request<RequirementOut>(`/projects/${projectId}/requirements`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (projectId: string, reqId: string, body: Partial<RequirementOut>) =>
      request<RequirementOut>(`/projects/${projectId}/requirements/${reqId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    delete: (projectId: string, reqId: string) =>
      request<void>(`/projects/${projectId}/requirements/${reqId}`, { method: "DELETE" }),
  },

  // ── Scenarios ────────────────────────────────────────────────────────────────
  scenarios: {
    list: (reqId: string) => request<ScenarioOut[]>(`/requirements/${reqId}/scenarios`),
    generate: (reqId: string) =>
      request<ScenarioOut[]>(`/requirements/${reqId}/scenarios/generate`, { method: "POST" }),
    create: (reqId: string, body: { type: string; description: string }) =>
      request<ScenarioOut>(`/requirements/${reqId}/scenarios`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (reqId: string, scId: string, body: { description?: string; status?: string }) =>
      request<ScenarioOut>(`/requirements/${reqId}/scenarios/${scId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    delete: (reqId: string, scId: string) =>
      request<void>(`/requirements/${reqId}/scenarios/${scId}`, { method: "DELETE" }),
  },

  // ── Documents ────────────────────────────────────────────────────────────────
  documents: {
    generate: (projectId: string) =>
      request<{ status: string; documents: Array<{ type: string; format: string }> }>(
        `/projects/${projectId}/documents/generate`,
        { method: "POST" }
      ),
    downloadUrl: (projectId: string, docType: string, format: string) =>
      `${BASE_URL}/projects/${projectId}/documents/download/${docType}/${format}`,
  },

  // ── Traceability ─────────────────────────────────────────────────────────────
  tasks: {
    list: (reqId: string) => request<TaskOut[]>(`/requirements/${reqId}/tasks`),
    create: (reqId: string, body: { title: string; external_ref?: string }) =>
      request<TaskOut>(`/requirements/${reqId}/tasks`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    delete: (reqId: string, taskId: string) =>
      request<void>(`/requirements/${reqId}/tasks/${taskId}`, { method: "DELETE" }),
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────
export interface AuthToken {
  access_token: string;
  token_type: string;
  user_id: string;
  tenant_id: string;
  role: string;
  full_name: string;
}

export interface UserOut {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  role: string;
}

export interface TenantOut {
  id: string;
  name: string;
  ai_provider: string;
  has_claude_key: boolean;
  has_openai_key: boolean;
}

export interface ProjectOut {
  id: string;
  tenant_id: string;
  created_by: string;
  name: string;
  domain_type: string;
  description: string | null;
  created_at: string;
  requirement_count: number;
}

export interface DiscoveryItem {
  title: string;
  description?: string;
  category: "what_to_do" | "what_not_to_do" | "what_if";
}

export interface DiscoveryResult {
  what_to_do: DiscoveryItem[];
  what_not_to_do: DiscoveryItem[];
  what_if: DiscoveryItem[];
}

export interface ScenarioOut {
  id: string;
  requirement_id: string;
  type: string;
  description: string;
  status: string;
  created_at: string;
}

export interface RequirementOut {
  id: string;
  project_id: string;
  unique_id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  seq: number;
  created_at: string;
  scenarios: ScenarioOut[];
}

export interface TaskOut {
  id: string;
  requirement_id: string;
  title: string;
  external_ref: string | null;
  created_at: string;
}
