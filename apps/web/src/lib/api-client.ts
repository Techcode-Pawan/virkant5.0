import { siteConfig } from "./config";

export const AUTH_TOKEN_KEY = "forgewise_auth_token";
export const AUTH_EXPIRED_EVENT = "forgewise:auth-expired";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, any>;
  requestId?: string;

  constructor(status: number, code: string, message: string, details?: Record<string, any>, requestId?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }

  get isNetwork() {
    return this.code === "NETWORK_ERROR" || this.code === "TIMEOUT";
  }
}

export interface FetchOptions extends RequestInit {
  /** Abort after this many ms (default 30 s; chat uses longer). */
  timeoutMs?: number;
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

function buildUrl(endpoint: string): string {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  // Default: same-origin path, proxied by Next.js to the backend (no CORS, no hardcoded hosts).
  return siteConfig.apiBaseUrl ? `${siteConfig.apiBaseUrl}${path}` : path;
}

/**
 * Single request, no automatic re-send: retrying non-idempotent calls (chat, uploads)
 * would duplicate LLM usage and writes. Retry decisions live in the UI.
 */
export async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { timeoutMs = 30_000, signal, ...init } = options;
  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const token = getStoredToken();
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("timeout", "TimeoutError")), timeoutMs);
  const onAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener("abort", onAbort);

  let response: Response;
  try {
    response = await fetch(buildUrl(endpoint), { ...init, headers, signal: controller.signal });
  } catch {
    if (signal?.aborted) throw new ApiError(0, "ABORTED", "Request cancelled.");
    if (controller.signal.aborted) {
      throw new ApiError(0, "TIMEOUT", `The server did not respond within ${Math.round(timeoutMs / 1000)} s.`);
    }
    throw new ApiError(0, "NETWORK_ERROR", "Cannot reach the ForgeWise API. Check that the backend is running and your network is connected.");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }

  if (!response.ok) {
    let body: any = null;
    try {
      body = await response.json();
    } catch {
      /* non-JSON error (e.g. proxy failure) */
    }
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }
    const fallback =
      response.status === 502 || response.status === 504 || (response.status === 500 && !body)
        ? "The API server is not reachable through the proxy. Is the backend running on the configured API_PROXY_TARGET?"
        : `Request failed with status ${response.status}.`;
    throw new ApiError(
      response.status,
      body?.error || `HTTP_${response.status}`,
      body?.message || fallback,
      body?.details,
      body?.request_id,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function errorMessage(err: unknown, fallback = "Something went wrong."): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}
