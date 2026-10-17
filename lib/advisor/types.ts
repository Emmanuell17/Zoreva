import type { AdvisorAnalysis } from "@/lib/infinisynapse/validate";
import type { LocalWorkforceFindings } from "@/lib/workforce/types";

export type AdvisorJobStatus = "queued" | "running" | "completed" | "failed";

export type AdvisorJobPublic = {
  id: string;
  status: AdvisorJobStatus;
  progress: string;
  filename: string;
  createdAt: string;
  localFindings: LocalWorkforceFindings | null;
  analysis: AdvisorAnalysis | null;
  artifacts: string[];
  error: string | null;
};
