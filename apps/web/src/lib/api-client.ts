import { siteConfig } from "./config";

export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, any>;
  request_id?: string;
}

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${siteConfig.apiBaseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Retrieve auth token from localStorage if available in browser
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("forgewise_auth_token") || "mock-operator:a1111111:c1a2b3c4";
    if (!headers.has("Authorization") && token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: ApiError;
    try {
      errorData = await response.json();
    } catch {
      errorData = {
        error: "HTTP_ERROR",
        message: `Request failed with status ${response.status}`,
      };
    }
    throw errorData;
  }

  return response.json() as Promise<T>;
}
