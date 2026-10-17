import {
  InfiniSynapseApiError,
  getInfiniSynapseBaseUrl,
  infiniSynapseHeaders,
} from "@/lib/infinisynapse/config";

const REQUEST_TIMEOUT_MS = 100_000;

type Envelope<T> = {
  code?: number;
  message?: string;
  data?: T;
  success?: boolean;
  error?: string;
  ok?: boolean;
};

function joinUrl(path: string): string {
  return `${getInfiniSynapseBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

function classifyCode(code: number | null, status: number): InfiniSynapseApiError["kind"] {
  if (code === 1101 || code === 1105 || status === 401 || status === 403) {
    return "invalid_credentials";
  }
  return "http";
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new InfiniSynapseApiError("InfiniSynapse returned a non-JSON response.", {
      status: response.status,
      kind: "malformed",
    });
  }
}

function readCode(body: unknown): number | null {
  if (!body || typeof body !== "object") return null;
  const code = (body as Envelope<unknown>).code;
  return typeof code === "number" ? code : null;
}

function readMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const value = body as Envelope<unknown> & { notification?: { message?: string } };
  return (
    value.message ||
    value.error ||
    value.notification?.message ||
    fallback
  );
}

export async function infiniSynapseFetch<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const { timeoutMs = REQUEST_TIMEOUT_MS, headers, body, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  if (init.signal) {
    init.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const extraHeaders = infiniSynapseHeaders(headers);
    if (!(body instanceof FormData) && body && !extraHeaders["Content-Type"]) {
      extraHeaders["Content-Type"] = "application/json";
    }

    const response = await fetch(joinUrl(path), {
      ...rest,
      headers: extraHeaders,
      body,
      signal: controller.signal,
      cache: "no-store",
    });

    const parsed = await parseBody(response);
    const code = readCode(parsed);

    if (!response.ok) {
      throw new InfiniSynapseApiError(
        readMessage(parsed, `InfiniSynapse request failed (${response.status}).`),
        {
          status: response.status,
          code,
          kind: classifyCode(code, response.status),
        },
      );
    }

    if (code !== null && code !== 200) {
      throw new InfiniSynapseApiError(readMessage(parsed, "InfiniSynapse request failed."), {
        status: response.status,
        code,
        kind: classifyCode(code, response.status),
      });
    }

    if (parsed && typeof parsed === "object" && "success" in parsed) {
      const envelope = parsed as Envelope<T>;
      if (envelope.success === false) {
        throw new InfiniSynapseApiError(
          readMessage(parsed, "InfiniSynapse rejected the request."),
          { status: response.status, code, kind: classifyCode(code, response.status) },
        );
      }
    }

    if (parsed && typeof parsed === "object" && "data" in parsed) {
      return (parsed as Envelope<T>).data as T;
    }

    return parsed as T;
  } catch (error) {
    if (error instanceof InfiniSynapseApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new InfiniSynapseApiError("InfiniSynapse timed out.", {
        kind: "timeout",
      });
    }
    throw new InfiniSynapseApiError("Could not reach InfiniSynapse.", {
      kind: "http",
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function pingInfiniSynapse(): Promise<{ ok: true }> {
  const result = await infiniSynapseFetch<{ ok?: boolean } | { data?: { ok?: boolean } }>(
    "/api/ai/ping",
    { method: "GET", timeoutMs: 15_000 },
  );
  if (result && typeof result === "object" && "ok" in result && result.ok === true) {
    return { ok: true };
  }
  throw new InfiniSynapseApiError("InfiniSynapse ping did not return ok.", {
    kind: "malformed",
  });
}

export async function sendInfiniSynapseMessage(body: Record<string, unknown>) {
  return infiniSynapseFetch<unknown>("/api/ai/message", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getTaskWorkspace(taskId: string) {
  return infiniSynapseFetch<{ cwd?: string; files?: string[] }>(
    `/api/ai_task/getTaskWorkspace/${encodeURIComponent(taskId)}`,
    { method: "GET" },
  );
}

export async function previewTaskFile(taskId: string, fileName: string) {
  return infiniSynapseFetch<{ content?: string; fileType?: string }>(
    "/api/ai_task/previewFile",
    {
      method: "POST",
      body: JSON.stringify({ taskId, fileName }),
    },
  );
}

export async function cancelInfiniSynapseTask(taskId: string) {
  return infiniSynapseFetch<unknown>(
    `/api/ai_task/cancelTask?taskId=${encodeURIComponent(taskId)}`,
    { method: "GET" },
  );
}

export async function uploadTaskWorkspaceFile(
  taskId: string,
  file: { bytes: Uint8Array; filename: string; mimeType: string },
) {
  const form = new FormData();
  form.append(
    "file",
    new Blob([Buffer.from(file.bytes)], { type: file.mimeType }),
    file.filename,
  );
  return infiniSynapseFetch<{
    filename?: string;
    assetId?: string;
    logicalPath?: string;
    name?: string;
    size?: number;
  }>(
    `/api/tools/taskUpload/${encodeURIComponent(taskId)}?subdir=upload_documents&naming=original`,
    { method: "POST", body: form, timeoutMs: 100_000 },
  );
}

export async function uploadSandboxFile(
  taskId: string,
  file: { bytes: Uint8Array; filename: string; mimeType: string },
) {
  const form = new FormData();
  form.append(
    "file",
    new Blob([Buffer.from(file.bytes)], { type: file.mimeType }),
    file.filename,
  );
  return infiniSynapseFetch<unknown>(
    `/api/ai/upload?taskId=${encodeURIComponent(taskId)}`,
    { method: "POST", body: form, timeoutMs: 100_000 },
  );
}

export function infiniSynapseEventsUrl(connId: string): string {
  return joinUrl(`/api/ai/events?connId=${encodeURIComponent(connId)}`);
}
