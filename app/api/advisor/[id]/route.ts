import { NextResponse } from "next/server";
import { requireManager } from "@/lib/auth/require-manager";
import { getAdvisorJobForOwner, toPublicJob } from "@/lib/advisor/store";

export const dynamic = "force-dynamic";

export async function GET(
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
  return NextResponse.json({ job: toPublicJob(job) });
}
