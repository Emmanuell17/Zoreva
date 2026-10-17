import {
  cancelInfiniSynapseTask,
  getTaskWorkspace,
  previewTaskFile,
  sendInfiniSynapseMessage,
  uploadSandboxFile,
  uploadTaskWorkspaceFile,
} from "@/lib/infinisynapse/client";
import {
  InfiniSynapseApiError,
  publicErrorMessage,
} from "@/lib/infinisynapse/config";
import {
  consumeInfiniSynapseEvents,
  isCompletionMessage,
  isErrorNotification,
  isUploadAsk,
  notificationText,
  readMessage,
  readTaskId,
  waitForReady,
  type InfiniSynapseSseEvent,
} from "@/lib/infinisynapse/sse";
import {
  parseAdvisorAnalysis,
  type AdvisorAnalysis,
} from "@/lib/infinisynapse/validate";
import { localWorkforceChecks } from "@/lib/workforce/local-checks";
import { parseWorkforceFile } from "@/lib/workforce/parse";
import {
  completeJob,
  failJob,
  getAdvisorJob,
  setJobProgress,
  startJobRun,
  type AdvisorJob,
} from "@/lib/advisor/store";

const ANALYSIS_TIMEOUT_MS = 180_000;
const READY_WAIT_MS = 3_000;

function analysisPrompt(filename: string, rowCount: number): string {
  return [
    "Analyze this workforce spreadsheet for Zoreva, a shift coordination app.",
    `The file "${filename}" is in this task workspace under upload_documents (${rowCount} data rows).`,
    "Find missing information, inconsistent records, and staffing issues.",
    "Do not invent people, shifts, or facts that are not in the file.",
    "Do not produce a final schedule. Do not claim you enforced booking rules.",
    "This analysis is advisory only. Zoreva keeps hard scheduling constraints in its own app logic.",
    "When finished, return ONLY a JSON object in a markdown fence with this exact shape:",
    '{ "summary": "string", "missingInformation": ["string"], "inconsistentRecords": [{"row": 1, "issue": "string"}], "staffingIssues": ["string"], "recommendations": ["string"] }',
  ].join("\n");
}

function collectSayText(
  event: InfiniSynapseSseEvent,
  collected: string[],
): void {
  const message = readMessage(event);
  if (!message?.text) return;
  if (message.type === "say" || !message.type) {
    collected.push(message.text);
  }
}

async function readWorkspaceAnalysis(taskId: string): Promise<{
  analysis: AdvisorAnalysis | null;
  artifacts: string[];
  previewText: string;
}> {
  const workspace = await getTaskWorkspace(taskId);
  const files = (workspace?.files ?? []).filter((name) => typeof name === "string");
  const previewable = files.filter((name) =>
    /\.(md|json|txt|csv)$/i.test(name),
  );
  const chunks: string[] = [];
  for (const fileName of previewable.slice(0, 8)) {
    try {
      const preview = await previewTaskFile(taskId, fileName);
      if (typeof preview?.content === "string" && preview.content.trim()) {
        chunks.push(preview.content);
      }
    } catch {
      // Preview can fail for binary files; keep going.
    }
  }
  const previewText = chunks.join("\n\n");
  return {
    analysis: parseAdvisorAnalysis(previewText),
    artifacts: files.slice(0, 20),
    previewText,
  };
}

export async function runWorkforceAnalysis(jobId: string): Promise<AdvisorJob> {
  const job = getAdvisorJob(jobId);
  if (!job) throw new Error("Unknown analysis job.");

  startJobRun(jobId, "Connecting to InfiniSynapse…");

  const table = parseWorkforceFile(job.file.bytes, job.file.filename);
  const localFindings = localWorkforceChecks(table);
  const collected: string[] = [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS);
  const { markReady, ready } = waitForReady(READY_WAIT_MS, controller.signal);

  let completed = false;
  let uploadAsked = false;
  let lastTaskId = job.infiniTaskId;

  const events = consumeInfiniSynapseEvents(
    job.connId,
    async (event) => {
      const seenTaskId = readTaskId(event);
      if (seenTaskId) lastTaskId = seenTaskId;

      if (event.event === "state.ready") markReady();
      if (isErrorNotification(event)) {
        throw new InfiniSynapseApiError(notificationText(event));
      }

      const message = readMessage(event);
      if (event.event === "message.add" || event.event === "message.partial") {
        collectSayText(event, collected);
        if (message?.text) {
          setJobProgress(jobId, "InfiniSynapse is analyzing the file…", lastTaskId);
        }
      }

      if (isUploadAsk(message) && !uploadAsked) {
        uploadAsked = true;
        setJobProgress(jobId, "Uploading the spreadsheet to the task sandbox…", lastTaskId);
        const uploaded = await uploadSandboxFile(lastTaskId, job.file);
        await sendInfiniSynapseMessage({
          type: "askResponse",
          taskId: lastTaskId,
          connId: job.connId,
          askResponse: "messageResponse",
          text: JSON.stringify(uploaded ?? { filename: job.file.filename }),
        });
      }

      if (isCompletionMessage(message)) {
        completed = true;
        controller.abort();
      }
    },
    controller.signal,
  ).catch((error) => {
    if (controller.signal.aborted && completed) return;
    throw error;
  });

  try {
    await ready;
    setJobProgress(jobId, "Uploading source file…", lastTaskId);
    await uploadTaskWorkspaceFile(job.infiniTaskId, job.file);

    setJobProgress(jobId, "Starting InfiniSynapse analysis…", lastTaskId);
    await sendInfiniSynapseMessage({
      type: "newTask",
      text: analysisPrompt(job.file.filename, table.rows.length),
      connId: job.connId,
      taskId: job.infiniTaskId,
      chatSettings: { mode: "act" },
      autoApprovalSettings: {
        maxRequests: 1000,
        maxSubAgentRequests: 500,
        enableNotifications: true,
        debugMode: false,
        enableWebSearch: false,
        enableReadImage: false,
        enableBrowser: false,
        enableNativeToolCalling: true,
      },
    });

    await events;

    if (!completed && controller.signal.aborted) {
      throw new InfiniSynapseApiError("InfiniSynapse timed out.", { kind: "timeout" });
    }

    setJobProgress(jobId, "Reading InfiniSynapse results…", lastTaskId);
    const workspace = await readWorkspaceAnalysis(lastTaskId);
    const analysis =
      workspace.analysis ?? parseAdvisorAnalysis(collected.join("\n\n"));

    if (!analysis) {
      const failed = failJob(
        jobId,
        "InfiniSynapse finished, but the response was not valid analysis JSON. Nothing was invented.",
        { infiniTaskId: lastTaskId, localFindings },
      );
      return failed!;
    }

    const done = completeJob(jobId, {
      infiniTaskId: lastTaskId,
      localFindings,
      analysis,
      artifacts: workspace.artifacts,
    });
    return done!;
  } catch (error) {
    if (lastTaskId) {
      try {
        await cancelInfiniSynapseTask(lastTaskId);
      } catch {
        // Best-effort cancel; the user-facing error is the original failure.
      }
    }
    const failed = failJob(jobId, publicErrorMessage(error), {
      infiniTaskId: lastTaskId,
      localFindings,
    });
    return failed!;
  } finally {
    clearTimeout(timeout);
  }
}
