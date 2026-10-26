import {
  InfiniSynapseApiError,
  alternateInfiniSynapseBaseUrl,
  getInfiniSynapseBaseUrl,
  infiniSynapseHeaders,
  rememberInfiniSynapseBaseUrl,
} from "@/lib/infinisynapse/config";
import { infiniSynapseEventsUrl } from "@/lib/infinisynapse/client";

export type InfiniSynapseSseEvent = {
  event: string;
  data: unknown;
};

export type InfiniSynapseMessage = {
  type?: string;
  text?: string;
  say?: string;
  ask?: string;
  partial?: boolean;
};

type MessagePayload = {
  taskId?: string;
  message?: InfiniSynapseMessage;
  type?: string;
  title?: string;
  messageTs?: number[];
};

export function parseSseBlock(block: string): InfiniSynapseSseEvent | null {
  const lines = block.split(/\r?\n/);
  let event = "message";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  if (dataLines.length === 0) return null;

  const raw = dataLines.join("\n");
  let data: unknown = raw;
  try {
    data = JSON.parse(raw);
  } catch {
    data = raw;
  }

  return { event, data };
}

export function isCompletionMessage(
  message: InfiniSynapseMessage | null | undefined,
): boolean {
  if (!message) return false;
  return message.say === "completion_result" || message.ask === "completion_result";
}

export function isUploadAsk(message: InfiniSynapseMessage | null | undefined): boolean {
  return message?.type === "ask" && message.ask === "upload_file_to_sandbox";
}

export function isErrorNotification(event: InfiniSynapseSseEvent): boolean {
  if (event.event !== "notification") return false;
  const data = event.data as MessagePayload | null;
  return data?.type === "error";
}

async function openInfiniSynapseEvents(connId: string, signal: AbortSignal): Promise<Response> {
  const primary = getInfiniSynapseBaseUrl();
  try {
    return await fetch(infiniSynapseEventsUrl(connId, primary), {
      method: "GET",
      headers: infiniSynapseHeaders({ Accept: "text/event-stream" }),
      signal,
      cache: "no-store",
    });
  } catch (error) {
    const alternate = alternateInfiniSynapseBaseUrl(primary);
    if (!alternate || signal.aborted) {
      throw unreachable(primary, error);
    }
    try {
      const response = await fetch(infiniSynapseEventsUrl(connId, alternate), {
        method: "GET",
        headers: infiniSynapseHeaders({ Accept: "text/event-stream" }),
        signal,
        cache: "no-store",
      });
      rememberInfiniSynapseBaseUrl(alternate);
      return response;
    } catch (retryError) {
      throw unreachable(primary, retryError);
    }
  }
}

function unreachable(baseUrl: string, error: unknown): InfiniSynapseApiError {
  if (error instanceof InfiniSynapseApiError) return error;
  if (error instanceof Error && error.name === "AbortError") {
    return new InfiniSynapseApiError("InfiniSynapse timed out.", { kind: "timeout" });
  }
  return new InfiniSynapseApiError(`Could not reach InfiniSynapse at ${baseUrl}.`, {
    kind: "http",
    status: 0,
  });
}

export async function consumeInfiniSynapseEvents(
  connId: string,
  onEvent: (event: InfiniSynapseSseEvent) => void | Promise<void>,
  signal: AbortSignal,
): Promise<void> {
  const response = await openInfiniSynapseEvents(connId, signal);

  if (!response.ok || !response.body) {
    throw new InfiniSynapseApiError(
      `Could not open InfiniSynapse event stream (${response.status || 0}).`,
      {
        status: response.status,
        kind: response.status === 401 || response.status === 403 ? "invalid_credentials" : "http",
      },
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (!signal.aborted) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split(/\r?\n\r?\n/);
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const parsed = parseSseBlock(part);
      if (parsed) await onEvent(parsed);
    }
  }
}

export function waitForReady(
  timeoutMs: number,
  signal: AbortSignal,
): {
  markReady: () => void;
  ready: Promise<void>;
} {
  let markReady = () => {};
  const ready = new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    signal.addEventListener("abort", onAbort, { once: true });
    markReady = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      resolve();
    };
  });
  return { markReady, ready };
}

export function readTaskId(event: InfiniSynapseSseEvent): string | null {
  if (!event.data || typeof event.data !== "object") return null;
  const taskId = (event.data as MessagePayload).taskId;
  return typeof taskId === "string" && taskId ? taskId : null;
}

export function readMessage(event: InfiniSynapseSseEvent): InfiniSynapseMessage | null {
  if (!event.data || typeof event.data !== "object") return null;
  const message = (event.data as MessagePayload).message;
  return message && typeof message === "object" ? message : null;
}

export function notificationText(event: InfiniSynapseSseEvent): string {
  if (!event.data || typeof event.data !== "object") {
    return "InfiniSynapse reported a task failure.";
  }
  const data = event.data as { title?: unknown; message?: unknown };
  if (typeof data.message === "string" && data.message.trim()) return data.message;
  if (typeof data.title === "string" && data.title.trim()) return data.title;
  return "InfiniSynapse reported a task failure.";
}
