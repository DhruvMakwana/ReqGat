const TOKEN_KEY = "reqgat_token";
const USER_KEY = "reqgat_user";

export interface AuthUser {
  user_id: string;
  tenant_id: string;
  role: string;
  full_name: string;
  access_token: string;
  user_type?: string | null;
}

/** Persist authentication data (token + user profile) to localStorage. */
export function saveAuth(data: AuthUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(data));
}

/** Retrieve the stored JWT token, or null if not authenticated. */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/** Retrieve the stored user profile, or null if not authenticated. */
export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

/** Remove all authentication data from localStorage (logout). */
export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/** Check whether a token exists in localStorage. */
export function isAuthenticated(): boolean {
  return !!getToken();
}
