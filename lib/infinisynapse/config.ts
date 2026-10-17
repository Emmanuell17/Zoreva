const DEFAULT_BASE_URL = "https://app.infinisynapse.com";

export function getInfiniSynapseBaseUrl(): string {
  const value = process.env.INFINISYNAPSE_BASE_URL?.trim();
  return value ? value.replace(/\/$/, "") : DEFAULT_BASE_URL;
}

export function getInfiniSynapseApiKey(): string | null {
  const value = process.env.INFINISYNAPSE_API_KEY?.trim();
  return value ? value : null;
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
