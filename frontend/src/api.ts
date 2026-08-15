const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const TOKEN_KEY = "typing_speed_test_token";
const USERNAME_KEY = "typing_speed_test_username";

export interface ResultPayload {
  wpm: number;
  accuracy: number;
  duration: number;
}

export interface ResultResponse extends ResultPayload {
  id: number;
  user_id: number;
  created_at: string;
}

export interface StatsResponse {
  avg_wpm: number;
  best_wpm: number;
  avg_accuracy: number;
  total_tests: number;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function extractErrorMessage(body: unknown): string {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((d) => (d && typeof d === "object" && "msg" in d ? String((d as { msg: unknown }).msg) : String(d)))
        .join(", ");
    }
  }
  return "Something went wrong. Please try again.";
}

async function request<T>(path: string, options: RequestInit = {}, auth = false): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (auth) {
    const token = getToken();
    if (!token) throw new ApiError(401, "You must be logged in.");
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(response.status, extractErrorMessage(body));
  }
  return body as T;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUsername(): string | null {
  return localStorage.getItem(USERNAME_KEY);
}

export function isLoggedIn(): boolean {
  return getToken() !== null;
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
}

export async function register(username: string, email: string, password: string): Promise<void> {
  await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
}

export async function login(username: string, password: string): Promise<void> {
  const data = await request<{ access_token: string; token_type: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(USERNAME_KEY, username);
}

export async function submitResult(payload: ResultPayload): Promise<ResultResponse> {
  return request<ResultResponse>("/results", { method: "POST", body: JSON.stringify(payload) }, true);
}

export async function getResults(): Promise<ResultResponse[]> {
  return request<ResultResponse[]>("/results", { method: "GET" }, true);
}

export async function getStats(): Promise<StatsResponse> {
  return request<StatsResponse>("/results/stats", { method: "GET" }, true);
}
