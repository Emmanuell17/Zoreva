import { NextResponse } from "next/server";
import { failJob, getAdvisorJob, toPublicJob } from "@/lib/advisor/store";
import { cancelInfiniSynapseTask } from "@/lib/infinisynapse/client";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const job = getAdvisorJob(id);
  if (!job) {
    return NextResponse.json({ error: "That analysis was not found." }, { status: 404 });
  }
  if (job.status === "completed" || job.status === "failed") {
    return NextResponse.json({ job: toPublicJob(job) });
  }

  try {
    await cancelInfiniSynapseTask(job.infiniTaskId);
  } catch {
    // Still mark the business job cancelled so the UI can stop polling.
  }

  const cancelled = failJob(id, "The analysis was cancelled.");
  return NextResponse.json({ job: toPublicJob(cancelled ?? job) });
}
