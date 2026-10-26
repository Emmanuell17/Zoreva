const OVERSEAS_BASE_URL = "https://app.infinisynapse.com";
const CHINA_BASE_URL = "https://app.infinisynapse.cn";

let baseUrlOverride: string | null = null;

export function getInfiniSynapseBaseUrl(): string {
  return baseUrlOverride ?? configuredInfiniSynapseBaseUrl();
}

export function configuredInfiniSynapseBaseUrl(): string {
  return normalizeInfiniSynapseBaseUrl(process.env.INFINISYNAPSE_BASE_URL) ?? OVERSEAS_BASE_URL;
}

export function rememberInfiniSynapseBaseUrl(baseUrl: string): void {
  baseUrlOverride = baseUrl;
}

export function alternateInfiniSynapseBaseUrl(baseUrl: string): string | null {
  if (baseUrl === CHINA_BASE_URL) return OVERSEAS_BASE_URL;
  if (baseUrl === OVERSEAS_BASE_URL) return CHINA_BASE_URL;
  return null;
}

export function normalizeInfiniSynapseBaseUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  let value = raw.replace(/^\uFEFF/, "").trim().replace(/^['"]+|['"]+$/g, "").trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  url.pathname = url.pathname.replace(/\/+$/, "").replace(/\/api$/i, "");
  url.search = "";
  url.hash = "";
  if (url.hostname === "api.infinisynapse.com") url.hostname = "app.infinisynapse.com";
  if (url.hostname === "api.infinisynapse.cn") url.hostname = "app.infinisynapse.cn";
  return url.toString().replace(/\/$/, "");
}

export function getInfiniSynapseApiKey(): string | null {
  const raw = process.env.INFINISYNAPSE_API_KEY;
  if (!raw) return null;
  const value = raw
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^['"]+|['"]+$/g, "")
    .replace(/^Bearer\s+/i, "")
    .replace(/[\s\u200B\u200C\u200D\uFEFF]+/g, "");
  return value || null;
}

export function isInfiniSynapseConfigured(): boolean {
  return Boolean(getInfiniSynapseApiKey());
}

export function infiniSynapseHeaders(
  extra?: HeadersInit,
): Record<string, string> {
  const key = getInfiniSynapseApiKey();
  if (!key) {
    throw new InfiniSynapseConfigError(
      "InfiniSynapse is not configured. Set INFINISYNAPSE_API_KEY on the server.",
    );
  }

  return {
    Authorization: `Bearer ${key}`,
    "x-lang": "en",
    ...headersToRecord(extra),
  };
}

function headersToRecord(extra?: HeadersInit): Record<string, string> {
  if (!extra) return {};
  if (extra instanceof Headers) return Object.fromEntries(extra.entries());
  if (Array.isArray(extra)) return Object.fromEntries(extra);
  return { ...extra };
}

export class InfiniSynapseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InfiniSynapseConfigError";
  }
}

export class InfiniSynapseApiError extends Error {
  status: number;
  code: number | null;
  kind: "invalid_credentials" | "timeout" | "http" | "malformed";

  constructor(
    message: string,
    options: {
      status?: number;
      code?: number | null;
      kind?: InfiniSynapseApiError["kind"];
    } = {},
  ) {
    super(message);
    this.name = "InfiniSynapseApiError";
    this.status = options.status ?? 0;
    this.code = options.code ?? null;
    this.kind = options.kind ?? "http";
  }
}

export function publicErrorMessage(error: unknown): string {
  if (error instanceof InfiniSynapseConfigError) return error.message;
  if (error instanceof InfiniSynapseApiError) {
    if (error.kind === "invalid_credentials") {
      return "InfiniSynapse rejected the server API key. Replace INFINISYNAPSE_API_KEY and try again.";
    }
    if (error.kind === "timeout") {
      return "InfiniSynapse timed out before the analysis finished.";
    }
    if (error.kind === "malformed") {
      return "InfiniSynapse returned a response we could not read.";
    }
    return error.message;
  }
  return "The analysis request failed.";
}
