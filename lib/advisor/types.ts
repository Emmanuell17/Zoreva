import type { AdvisorAnalysis } from "@/lib/advisor/validate";
import type { LocalWorkforceFindings } from "@/lib/workforce/types";

export type AdvisorJobStatus = "running" | "completed" | "failed";

export type AdvisorJobPublic = {
  status: AdvisorJobStatus;
  progress: string;
  filename: string;
  createdAt: string;
  localFindings: LocalWorkforceFindings | null;
  analysis: AdvisorAnalysis | null;
  error: string | null;
};
