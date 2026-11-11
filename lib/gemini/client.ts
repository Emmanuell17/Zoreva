import {
  GEMINI_API_REVISION,
  GEMINI_BASE_URL,
  GeminiApiError,
  GeminiConfigError,
  geminiErrorKind,
  getGeminiApiKey,
  getGeminiModel,
} from "@/lib/gemini/config";

const REQUEST_TIMEOUT_MS = 90_000;

type GeminiErrorBody = {
  error?: {
    code?: number | string;
    message?: string;
    status?: string;
    details?: Array<{ reason?: string }>;
  };
};

function readError(body: unknown): { message: string; reason: string } | null {
  const envelope = (Array.isArray(body) ? body[0] : body) as GeminiErrorBody | null;
  const error = envelope?.error;
  if (!error) return null;
  const reasons = (error.details ?? []).map((detail) => detail.reason ?? "");
  return {
    message: error.message ?? "",
    reason: [error.status ?? "", typeof error.code === "string" ? error.code : "", ...reasons].join(" "),
  };
}

type InteractionContent = { type?: string; text?: string };

type Interaction = {
  status?: string;
  steps?: Array<{ type?: string; content?: InteractionContent[] }>;
};

async function geminiFetch<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const key = getGeminiApiKey();
  if (!key) {
    throw new GeminiConfigError(
      "Gemini is not configured. Set GEMINI_API_KEY on the server.",
    );
  }

  const { timeoutMs = REQUEST_TIMEOUT_MS, headers, signal, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const response = await fetch(`${GEMINI_BASE_URL}${path}`, {
      ...rest,
      headers: {
        "x-goog-api-key": key,
        "Content-Type": "application/json",
        "Api-Revision": GEMINI_API_REVISION,
        ...headers,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    const text = await response.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        throw new GeminiApiError("Gemini returned a non-JSON response.", {
          status: response.status,
          kind: "malformed",
        });
      }
    }

    if (!response.ok) {
      const error = readError(body);
      throw new GeminiApiError(
        error?.message || `Gemini request failed (${response.status}).`,
        {
          status: response.status,
          kind: geminiErrorKind(response.status, error?.reason ?? ""),
        },
      );
    }

    return body as T;
  } catch (error) {
    if (error instanceof GeminiApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      if (signal?.aborted) throw error;
      throw new GeminiApiError("Gemini timed out.", { kind: "timeout" });
    }
    const cause = (error as { cause?: { code?: string } } | null)?.cause;
    const detail = cause?.code ? ` (${cause.code})` : "";
    throw new GeminiApiError(`Could not reach Gemini${detail}.`, { kind: "unreachable" });
  } finally {
    clearTimeout(timer);
  }
}

/** Looks up the configured model. Validates the key without spending generation quota. */
export async function checkGeminiModel(): Promise<void> {
  await geminiFetch(`/v1beta/models/${encodeURIComponent(getGeminiModel())}`, {
    method: "GET",
    timeoutMs: 15_000,
  });
}

export async function generateGeminiJson(
  input: {
    model?: string;
    systemInstruction: string;
    prompt: string;
    schema: Record<string, unknown>;
    timeoutMs?: number;
  },
  signal?: AbortSignal,
): Promise<string> {
  const interaction = await geminiFetch<Interaction>("/v1beta/interactions", {
    method: "POST",
    signal,
    timeoutMs: input.timeoutMs,
    body: JSON.stringify({
      model: input.model ?? getGeminiModel(),
      system_instruction: input.systemInstruction,
      input: input.prompt,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: input.schema,
      },
      generation_config: { thinking_level: "low" },
      store: false,
    }),
  });

  const text = (interaction?.steps ?? [])
    .filter((step) => step.type === "model_output")
    .flatMap((step) => step.content ?? [])
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("");

  if (!text.trim()) {
    throw new GeminiApiError("Gemini returned an empty response.", { kind: "malformed" });
  }
  return text;
}
