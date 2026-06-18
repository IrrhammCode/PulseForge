import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";
const API_SECRET = process.env.PULSEFORGE_API_SECRET?.trim();

const FORWARD_REQUEST_HEADERS = [
  "authorization",
  "content-type",
  "accept",
  "x-pulseforge-key",
] as const;

const FORWARD_RESPONSE_HEADERS = ["content-type", "content-length", "cache-control"] as const;

function isCloudPath(path: string[]): boolean {
  return path[0] === "cloud";
}

function backendUrl(path: string[], search: string): string {
  return `${BACKEND_URL}/api/${path.join("/")}${search}`;
}

export async function proxyToBackend(
  request: NextRequest,
  path: string[]
): Promise<NextResponse> {
  const headers = new Headers();

  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  if (API_SECRET && !isCloudPath(path)) {
    headers.set("x-pulseforge-key", API_SECRET);
  }

  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
    init.duplex = "half";
  }

  const upstream = await fetch(backendUrl(path, request.nextUrl.search), init);
  const responseHeaders = new Headers();

  for (const name of FORWARD_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}