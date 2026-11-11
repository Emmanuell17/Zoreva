import { generateGeminiJson } from "@/lib/gemini/client";
import { GeminiApiError, getGeminiModels } from "@/lib/gemini/config";
import { parseAdvisorAnalysis, type AdvisorAnalysis } from "@/lib/advisor/validate";
import type { WorkforceTable } from "@/lib/workforce/parse";

// Two attempts must fit inside the route's 120s maxDuration.
const ATTEMPT_TIMEOUT_MS = 45_000;

const SYSTEM_INSTRUCTION = [
  "You review workforce spreadsheets for Zoreva, a shift coordination app.",
  "Find missing information, inconsistent records, and staffing issues.",
  "Do not invent people, shifts, or facts that are not in the file.",
  "Do not produce a final schedule. Do not claim you enforced booking rules.",
  "This analysis is advisory only. Zoreva keeps hard scheduling constraints in its own app logic.",
  "Row numbers refer to the spreadsheet row shown in the `row` column.",
].join("\n");

const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "Two or three sentences on the overall state of the sheet." },
    missingInformation: { type: "array", items: { type: "string" } },
    inconsistentRecords: {
      type: "array",
      items: {
        type: "object",
        properties: {
          row: { type: "integer" },
          issue: { type: "string" },
        },
        required: ["row", "issue"],
      },
    },
    staffingIssues: { type: "array", items: { type: "string" } },
    recommendations: { type: "array", items: { type: "string" } },
  },
  required: [
    "summary",
    "missingInformation",
    "inconsistentRecords",
    "staffingIssues",
    "recommendations",
  ],
};

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function tableAsCsv(table: WorkforceTable): string {
  const lines = [["row", ...table.headers].map(csvCell).join(",")];
  for (const row of table.rows) {
    lines.push(
      [String(row.row), ...table.headers.map((header) => row.values[header] ?? "")]
        .map(csvCell)
        .join(","),
    );
  }
  return lines.join("\n");
}

export async function runWorkforceAnalysis(
  table: WorkforceTable,
  signal?: AbortSignal,
): Promise<AdvisorAnalysis> {
  const prompt = [
    `File "${table.filename}" (${table.rows.length} data rows):`,
    "```csv",
    tableAsCsv(table),
    "```",
  ].join("\n");

  const models = getGeminiModels();
  let text = "";
  for (const [index, model] of models.entries()) {
    try {
      text = await generateGeminiJson(
        {
          model,
          systemInstruction: SYSTEM_INSTRUCTION,
          prompt,
          schema: ANALYSIS_SCHEMA,
          timeoutMs: ATTEMPT_TIMEOUT_MS,
        },
        signal,
      );
      break;
    } catch (error) {
      const retryable =
        error instanceof GeminiApiError && (error.kind === "busy" || error.kind === "timeout");
      if (!retryable || index === models.length - 1) throw error;
      console.warn(`Gemini model ${model} failed, trying ${models[index + 1]}:`, error.message);
    }
  }

  const analysis = parseAdvisorAnalysis(text);
  if (!analysis) {
    throw new GeminiApiError("Gemini returned analysis we could not validate.", {
      kind: "malformed",
    });
  }
  return analysis;
}
