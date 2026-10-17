import { after } from "next/server";
import { NextResponse } from "next/server";
import { createAdvisorJob, toPublicJob } from "@/lib/advisor/store";
import { runWorkforceAnalysis } from "@/lib/infinisynapse/run-analysis";
import { isInfiniSynapseConfigured } from "@/lib/infinisynapse/config";
import { localWorkforceChecks } from "@/lib/workforce/local-checks";
import { isAllowedWorkforceFile, parseWorkforceFile } from "@/lib/workforce/parse";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  if (!isInfiniSynapseConfigured()) {
    return NextResponse.json(
      {
        error:
          "InfiniSynapse is not configured. Add INFINISYNAPSE_API_KEY to the server environment.",
      },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload a CSV or Excel file." }, { status: 400 });
  }

  const invalid = isAllowedWorkforceFile({
    name: file.name,
    size: file.size,
  });
  if (invalid) {
    return NextResponse.json({ error: invalid }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    localWorkforceChecks(parseWorkforceFile(bytes, file.name));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not read that spreadsheet.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const job = createAdvisorJob({
    bytes,
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
  });

  after(() => {
    void runWorkforceAnalysis(job.id);
  });

  return NextResponse.json({ job: toPublicJob(job) }, { status: 202 });
}
