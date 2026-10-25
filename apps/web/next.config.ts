import type { NextConfig } from "next";

// Where the Next.js server forwards /api/v1/* (server-side only, never shipped to the browser).
const apiProxyTarget = (process.env.API_PROXY_TARGET || "http://127.0.0.1:8000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // The dev/prod proxy defaults to a 30 s timeout, shorter than an LLM call with
    // retries + fallback. When it fired, the old client re-sent the request directly
    // to the backend, doubling API usage. Keep this above LLM_TOTAL_TIMEOUT_SECONDS.
    proxyTimeout: 150_000,
  },
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${apiProxyTarget}/api/v1/:path*` }];
  },
};

export default nextConfig;
