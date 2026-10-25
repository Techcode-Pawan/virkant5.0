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
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = typeof window !== "undefined" ? cleanEndpoint : `${siteConfig.apiBaseUrl}${cleanEndpoint}`;
  
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Retrieve auth token from localStorage if available in browser
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("forgewise_auth_token") || "mock-operator:a1111111:c1a2b3c4:ws-a1111111:sess-default";
    if (!headers.has("Authorization") && token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (netErr: any) {
    // If relative path fails in browser, try absolute apiBaseUrl
    if (typeof window !== "undefined" && url === cleanEndpoint && siteConfig.apiBaseUrl) {
      try {
        response = await fetch(`${siteConfig.apiBaseUrl}${cleanEndpoint}`, {
          ...options,
          headers,
        });
      } catch (fallbackErr: any) {
        throw {
          error: "NETWORK_ERROR",
          message: "Unable to connect to ForgeWise AI backend. Ensure the backend server is running on port 8000.",
          details: { original: fallbackErr.message },
        };
      }
    } else {
      throw {
        error: "NETWORK_ERROR",
        message: "Unable to connect to ForgeWise AI backend.",
        details: { original: netErr.message },
      };
    }
  }

  // If proxy returns 500 or 502/504, attempt direct backend call
  if (!response.ok && (response.status === 500 || response.status === 502 || response.status === 504) && typeof window !== "undefined" && url === cleanEndpoint) {
    try {
      const directResponse = await fetch(`http://127.0.0.1:8000${cleanEndpoint}`, {
        ...options,
        headers,
      });
      if (directResponse.ok) {
        return (await directResponse.json()) as T;
      }
    } catch {
      // Continue to error handling below
    }
  }

  if (!response.ok) {
    let errorData: ApiError;
    try {
      errorData = await response.json();
    } catch {
      const msg =
        response.status === 500
          ? "ForgeWise AI backend service is initializing or encountered an issue. Ensure backend is running on port 8000."
          : `Request failed with status ${response.status}`;
      errorData = {
        error: "HTTP_ERROR",
        message: msg,
      };
    }
    throw errorData;
  }

  return response.json() as Promise<T>;
}
