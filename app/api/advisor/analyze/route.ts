import { NextResponse } from "next/server";
import { requireManager } from "@/lib/auth/require-manager";
import {
  beginAdvisorJob,
  createAdvisorJob,
  failJob,
  getAdvisorJob,
  subscribeAdvisorJob,
  toPublicJob,
} from "@/lib/advisor/store";
import { runWorkforceAnalysis } from "@/lib/infinisynapse/run-analysis";
import { isInfiniSynapseConfigured, publicErrorMessage } from "@/lib/infinisynapse/config";
import { localWorkforceChecks } from "@/lib/workforce/local-checks";
import { isAllowedWorkforceFile, parseWorkforceFile } from "@/lib/workforce/parse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const access = await requireManager(request);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

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
  let localFindings;
  try {
    localFindings = localWorkforceChecks(parseWorkforceFile(bytes, file.name));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not read that spreadsheet.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const job = createAdvisorJob(
    {
      bytes,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
    },
    { uid: access.access.uid, companyId: access.access.companyId },
  );
  const abort = new AbortController();
  request.signal.addEventListener("abort", () => abort.abort(), { once: true });
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (currentId: string) => {
        const current = getAdvisorJob(currentId);
        if (!current) return;
        try {
          // Padding pushes the event through proxies that hold small chunks.
          controller.enqueue(encoder.encode(`: ${" ".repeat(2048)}\n\n`));
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(toPublicJob(current))}\n\n`),
          );
        } catch {
          abort.abort();
        }
      };
      const unsubscribe = subscribeAdvisorJob(job.id, () => send(job.id));
      try {
        beginAdvisorJob(job.id, localFindings);
        await runWorkforceAnalysis(job.id, abort.signal);
      } catch (error) {
        const current = getAdvisorJob(job.id);
        if (current && current.status !== "completed" && current.status !== "failed") {
          failJob(job.id, publicErrorMessage(error), { localFindings });
        }
      } finally {
        unsubscribe();
        try {
          send(job.id);
          controller.close();
        } catch {
          // The browser already closed the stream.
        }
      }
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
