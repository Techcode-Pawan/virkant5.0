import { NextResponse } from "next/server";
import { siteConfig } from "@/lib/config";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    app: siteConfig.brandName,
    version: siteConfig.version,
    timestamp: new Date().toISOString(),
  });
}
