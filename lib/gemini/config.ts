export const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com";
export const GEMINI_API_REVISION = "2026-05-20";
const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const DEFAULT_FALLBACK_MODEL = "gemini-3.8-flash";

function cleanEnv(raw: string | undefined): string | null {
  if (!raw) return null;
  const value = raw
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^['"]+|['"]+$/g, "")
    .replace(/[\s\u200B\u200C\u200D\uFEFF]+/g, "");
  return value || null;
}

export function getGeminiApiKey(): string | null {
  return cleanEnv(process.env.GEMINI_API_KEY);
}

export function getGeminiModel(): string {
  return cleanEnv(process.env.GEMINI_MODEL)?.replace(/^models\//, "") ?? DEFAULT_MODEL;
}

/** Models to try in order. Each Gemini model has its own free-tier quota. */
export function getGeminiModels(): string[] {
  const fallback =
    cleanEnv(process.env.GEMINI_FALLBACK_MODEL)?.replace(/^models\//, "") ??
    DEFAULT_FALLBACK_MODEL;
  return [...new Set([getGeminiModel(), fallback])];
}

export function isGeminiConfigured(): boolean {
  return Boolean(getGeminiApiKey());
}

export class GeminiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiConfigError";
  }
}

export class GeminiApiError extends Error {
  status: number;
  kind: "invalid_credentials" | "busy" | "timeout" | "unreachable" | "malformed" | "http";

  constructor(
    message: string,
    options: { status?: number; kind?: GeminiApiError["kind"] } = {},
  ) {
    super(message);
    this.name = "GeminiApiError";
    this.status = options.status ?? 0;
    this.kind = options.kind ?? "http";
  }
}

export function geminiErrorKind(status: number, reason: string): GeminiApiError["kind"] {
  if (status === 401 || status === 403 || /API_KEY_INVALID|PERMISSION_DENIED|UNAUTHENTICATED/i.test(reason)) {
    return "invalid_credentials";
  }
  if (status === 429 || status === 503 || /RESOURCE_EXHAUSTED|UNAVAILABLE/i.test(reason)) {
    return "busy";
  }
  return "http";
}

export function publicErrorMessage(error: unknown): string {
  if (error instanceof GeminiConfigError) return error.message;
  if (error instanceof GeminiApiError) {
    if (error.kind === "invalid_credentials") {
      return "Gemini rejected the server API key. Replace GEMINI_API_KEY and try again.";
    }
    if (error.kind === "busy") {
      const detail = error.message ? ` Google said: "${error.message.slice(0, 300)}"` : "";
      return `Gemini is busy or the free-tier limit was reached. The Zoreva checks below still stand.${detail}`;
    }
    if (error.kind === "timeout") {
      return "Gemini timed out before the analysis finished.";
    }
    if (error.kind === "malformed") {
      return "Gemini returned a response we could not read. Nothing was invented.";
    }
    return error.message;
  }
  return "The analysis request failed.";
}
