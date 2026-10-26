import { NextResponse } from "next/server";
import { requireManager } from "@/lib/auth/require-manager";
import { failJob, getAdvisorJobForOwner, toPublicJob } from "@/lib/advisor/store";
import { cancelInfiniSynapseTask } from "@/lib/infinisynapse/client";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await requireManager(request);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { id } = await context.params;
  const job = getAdvisorJobForOwner(id, access.access.uid);
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
