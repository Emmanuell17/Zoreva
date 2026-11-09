import { NextResponse } from "next/server";
import { requireManager } from "@/lib/auth/require-manager";
import { checkGeminiModel } from "@/lib/gemini/client";
import {
  GeminiApiError,
  isGeminiConfigured,
  publicErrorMessage,
} from "@/lib/gemini/config";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await requireManager(request);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  if (!isGeminiConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        reachable: false,
        error:
          "Set GEMINI_API_KEY in the server environment. The key stays on the server.",
      },
      { status: 503 },
    );
  }

  try {
    await checkGeminiModel();
    return NextResponse.json({ configured: true, reachable: true });
  } catch (error) {
    const invalid = error instanceof GeminiApiError && error.kind === "invalid_credentials";
    console.error("Gemini health check failed:", publicErrorMessage(error));
    return NextResponse.json(
      {
        configured: true,
        reachable: false,
        error: publicErrorMessage(error),
      },
      { status: invalid ? 401 : 502 },
    );
  }
}
