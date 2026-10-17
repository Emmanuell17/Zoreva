import { NextResponse } from "next/server";
import { getAdvisorJob, toPublicJob } from "@/lib/advisor/store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const job = getAdvisorJob(id);
  if (!job) {
    return NextResponse.json({ error: "That analysis was not found." }, { status: 404 });
  }
  return NextResponse.json({ job: toPublicJob(job) });
}
