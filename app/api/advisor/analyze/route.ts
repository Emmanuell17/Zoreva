import { NextResponse } from "next/server";
import { requireManager } from "@/lib/auth/require-manager";
import { runWorkforceAnalysis } from "@/lib/advisor/run-analysis";
import type { AdvisorJobPublic } from "@/lib/advisor/types";
import { isGeminiConfigured, publicErrorMessage } from "@/lib/gemini/config";
import { localWorkforceChecks } from "@/lib/workforce/local-checks";
import { isAllowedWorkforceFile, parseWorkforceFile } from "@/lib/workforce/parse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const access = await requireManager(request);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "Gemini is not configured. Add GEMINI_API_KEY to the server environment." },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload a CSV or Excel file." }, { status: 400 });
  }

  const invalid = isAllowedWorkforceFile({ name: file.name, size: file.size });
  if (invalid) {
    return NextResponse.json({ error: invalid }, { status: 400 });
  }

  let table;
  try {
    table = parseWorkforceFile(new Uint8Array(await file.arrayBuffer()), file.name);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not read that spreadsheet.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const base = {
    filename: file.name,
    createdAt: new Date().toISOString(),
    localFindings: localWorkforceChecks(table),
  };

  let job: AdvisorJobPublic;
  try {
    const analysis = await runWorkforceAnalysis(table, request.signal);
    job = { ...base, status: "completed", progress: "Done", analysis, error: null };
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    job = {
      ...base,
      status: "failed",
      progress: "Failed",
      analysis: null,
      error: publicErrorMessage(error),
    };
  }

  return NextResponse.json({ job });
}
