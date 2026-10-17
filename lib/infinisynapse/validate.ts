export type AdvisorRecordIssue = {
  row: number;
  issue: string;
};

export type AdvisorAnalysis = {
  summary: string;
  missingInformation: string[];
  inconsistentRecords: AdvisorRecordIssue[];
  staffingIssues: string[];
  recommendations: string[];
};

const MAX_TEXT = 2000;
const MAX_ITEMS = 50;

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text.slice(0, MAX_TEXT) : null;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asTrimmedString(item))
    .filter((item): item is string => Boolean(item))
    .slice(0, MAX_ITEMS);
}

function asRecordIssues(value: unknown): AdvisorRecordIssue[] {
  if (!Array.isArray(value)) return [];
  const issues: AdvisorRecordIssue[] = [];
  for (const item of value.slice(0, MAX_ITEMS)) {
    if (!item || typeof item !== "object") continue;
    const rowValue = (item as { row?: unknown }).row;
    const issue = asTrimmedString((item as { issue?: unknown }).issue);
    const row =
      typeof rowValue === "number" && Number.isInteger(rowValue) && rowValue > 0
        ? rowValue
        : null;
    if (row && issue) issues.push({ row, issue });
  }
  return issues;
}

function extractJsonCandidate(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced?.[1] ?? text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("no-json");
  }
  return JSON.parse(raw.slice(start, end + 1)) as unknown;
}

export function validateAdvisorAnalysis(value: unknown): AdvisorAnalysis | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const summary = asTrimmedString(record.summary);
  if (!summary) return null;

  const missingInformation = asStringList(record.missingInformation);
  const inconsistentRecords = asRecordIssues(record.inconsistentRecords);
  const staffingIssues = asStringList(record.staffingIssues);
  const recommendations = asStringList(record.recommendations);

  const hasFindings =
    missingInformation.length > 0 ||
    inconsistentRecords.length > 0 ||
    staffingIssues.length > 0 ||
    recommendations.length > 0;

  if (!hasFindings && summary.length < 12) return null;

  return {
    summary,
    missingInformation,
    inconsistentRecords,
    staffingIssues,
    recommendations,
  };
}

export function parseAdvisorAnalysis(text: string): AdvisorAnalysis | null {
  if (!text.trim()) return null;
  try {
    return validateAdvisorAnalysis(extractJsonCandidate(text));
  } catch {
    return null;
  }
}
