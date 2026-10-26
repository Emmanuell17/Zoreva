import {
  InfiniSynapseApiError,
  alternateInfiniSynapseBaseUrl,
  getInfiniSynapseBaseUrl,
  infiniSynapseHeaders,
  rememberInfiniSynapseBaseUrl,
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

function joinUrl(path: string, baseUrl = getInfiniSynapseBaseUrl()): string {
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function networkCause(error: unknown): { code?: string; message?: string } | null {
  if (!error || typeof error !== "object" || !("cause" in error)) return null;
  const cause = (error as { cause?: { code?: string; message?: string } }).cause;
  return cause && typeof cause === "object" ? cause : null;
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

function isUnreachable(error: unknown): error is InfiniSynapseApiError {
  return error instanceof InfiniSynapseApiError && error.kind === "http" && error.status === 0;
}

async function infiniSynapseFetchAt<T>(
  baseUrl: string,
  path: string,
  init: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const { timeoutMs = REQUEST_TIMEOUT_MS, headers, body, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  if (init.signal) {
    if (init.signal.aborted) controller.abort();
    else init.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const extraHeaders = infiniSynapseHeaders(headers);
    if (!(body instanceof FormData) && body && !extraHeaders["Content-Type"]) {
      extraHeaders["Content-Type"] = "application/json";
    }

    const response = await fetch(joinUrl(path, baseUrl), {
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
      const data = (parsed as Envelope<T>).data;
      if (data !== null && data !== undefined) return data as T;
    }

    return parsed as T;
  } catch (error) {
    if (error instanceof InfiniSynapseApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new InfiniSynapseApiError("InfiniSynapse timed out.", {
        kind: "timeout",
      });
    }
    const cause = networkCause(error);
    const detail = cause?.code ? ` (${cause.code})` : "";
    throw new InfiniSynapseApiError(`Could not reach InfiniSynapse at ${baseUrl}${detail}.`, {
      kind: "http",
      status: 0,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function infiniSynapseFetch<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const primary = getInfiniSynapseBaseUrl();
  try {
    return await infiniSynapseFetchAt<T>(primary, path, init);
  } catch (error) {
    const alternate = isUnreachable(error) ? alternateInfiniSynapseBaseUrl(primary) : null;
    if (!alternate || alternate === primary) throw error;
    try {
      const result = await infiniSynapseFetchAt<T>(alternate, path, init);
      rememberInfiniSynapseBaseUrl(alternate);
      return result;
    } catch (retryError) {
      if (retryError instanceof InfiniSynapseApiError && retryError.status !== 0) {
        rememberInfiniSynapseBaseUrl(alternate);
      }
      throw retryError;
    }
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

export async function sendInfiniSynapseMessage(
  body: Record<string, unknown>,
  signal?: AbortSignal,
) {
  return infiniSynapseFetch<unknown>("/api/ai/message", {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });
}

export async function getTaskWorkspace(taskId: string, signal?: AbortSignal) {
  return infiniSynapseFetch<{ cwd?: string; files?: string[] }>(
    `/api/ai_task/getTaskWorkspace/${encodeURIComponent(taskId)}`,
    { method: "GET", signal },
  );
}

export async function previewTaskFile(
  taskId: string,
  fileName: string,
  signal?: AbortSignal,
) {
  return infiniSynapseFetch<{ content?: string; fileType?: string }>(
    "/api/ai_task/previewFile",
    {
      method: "POST",
      body: JSON.stringify({ taskId, fileName }),
      signal,
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
  signal?: AbortSignal,
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
    { method: "POST", body: form, timeoutMs: 100_000, signal },
  );
}

export async function uploadSandboxFile(
  taskId: string,
  file: { bytes: Uint8Array; filename: string; mimeType: string },
  signal?: AbortSignal,
) {
  const form = new FormData();
  form.append(
    "file",
    new Blob([Buffer.from(file.bytes)], { type: file.mimeType }),
    file.filename,
  );
  return infiniSynapseFetch<unknown>(
    `/api/ai/upload?taskId=${encodeURIComponent(taskId)}`,
    { method: "POST", body: form, timeoutMs: 100_000, signal },
  );
}

export function infiniSynapseEventsUrl(connId: string, baseUrl?: string): string {
  return joinUrl(`/api/ai/events?connId=${encodeURIComponent(connId)}`, baseUrl);
}
