import { NextResponse } from "next/server";
import { pingInfiniSynapse } from "@/lib/infinisynapse/client";
import {
  InfiniSynapseApiError,
  isInfiniSynapseConfigured,
} from "@/lib/infinisynapse/config";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isInfiniSynapseConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        reachable: false,
        error:
          "Set INFINISYNAPSE_API_KEY in the server environment. The key stays on the server.",
      },
      { status: 503 },
    );
  }

  try {
    await pingInfiniSynapse();
    return NextResponse.json({ configured: true, reachable: true });
  } catch (error) {
    const invalid =
      error instanceof InfiniSynapseApiError && error.kind === "invalid_credentials";
    return NextResponse.json(
      {
        configured: true,
        reachable: false,
        error: invalid
          ? "InfiniSynapse rejected the server API key."
          : "Could not reach InfiniSynapse.",
      },
      { status: invalid ? 401 : 502 },
    );
  }
}
