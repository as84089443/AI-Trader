import { NextResponse } from "next/server";
import {
  normalizeSkyscanner,
  type SkyscannerLikePayload,
} from "@flight-finder/core";
import { addCaptured, clearCaptured, getCaptured } from "@/lib/captureStore";

export const dynamic = "force-dynamic";

// The extension's service worker posts here cross-origin, so allow CORS.
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

interface IngestBody {
  url?: string;
  payload?: SkyscannerLikePayload;
}

export async function POST(request: Request) {
  let body: IngestBody;
  try {
    body = (await request.json()) as IngestBody;
  } catch {
    return NextResponse.json(
      { error: "invalid JSON body" },
      { status: 400, headers: CORS },
    );
  }
  // Accept either { payload } or a raw Skyscanner-like object.
  const payload = (body.payload ?? (body as SkyscannerLikePayload)) ?? {};
  const itineraries = normalizeSkyscanner(payload);
  const added = addCaptured(itineraries);
  return NextResponse.json(
    {
      added,
      parsed: itineraries.length,
      total: getCaptured().itineraries.length,
      ...(body.url ? { from: body.url } : {}),
    },
    { headers: CORS },
  );
}

export function GET() {
  const { itineraries, updatedAt } = getCaptured();
  return NextResponse.json(
    { count: itineraries.length, updatedAt, itineraries },
    { headers: CORS },
  );
}

export function DELETE() {
  clearCaptured();
  return NextResponse.json({ ok: true }, { headers: CORS });
}
