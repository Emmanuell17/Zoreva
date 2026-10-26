import { randomUUID } from "crypto";
import type { AdvisorJobPublic, AdvisorJobStatus } from "@/lib/advisor/types";
import type { AdvisorAnalysis } from "@/lib/infinisynapse/validate";
import type { LocalWorkforceFindings } from "@/lib/workforce/types";

export type { AdvisorJobPublic, AdvisorJobStatus };

export type AdvisorFile = {
  bytes: Uint8Array;
  filename: string;
  mimeType: string;
};

export type AdvisorOwner = {
  uid: string;
  companyId: string;
};

export type AdvisorJob = AdvisorJobPublic & {
  infiniTaskId: string;
  connId: string;
  file: AdvisorFile;
  ownerUid: string;
  companyId: string;
};

const jobs = new Map<string, AdvisorJob>();
const listeners = new Map<string, Set<(job: AdvisorJob) => void>>();

function publish(job: AdvisorJob) {
  const set = listeners.get(job.id);
  if (!set) return;
  for (const listener of set) {
    try {
      listener(job);
    } catch {
      // A closed browser stream must not stop the analysis.
    }
  }
}

export function subscribeAdvisorJob(
  id: string,
  listener: (job: AdvisorJob) => void,
): () => void {
  const set = listeners.get(id) ?? new Set<(job: AdvisorJob) => void>();
  set.add(listener);
  listeners.set(id, set);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(id);
  };
}

export function toPublicJob(job: AdvisorJob): AdvisorJobPublic {
  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    filename: job.filename,
    createdAt: job.createdAt,
    localFindings: job.localFindings,
    analysis: job.analysis,
    artifacts: job.artifacts,
    error: job.error,
  };
}

export function createAdvisorJob(file: AdvisorFile, owner: AdvisorOwner): AdvisorJob {
  const job: AdvisorJob = {
    id: randomUUID(),
    infiniTaskId: randomUUID(),
    connId: randomUUID(),
    status: "queued",
    progress: "Queued",
    filename: file.filename,
    createdAt: new Date().toISOString(),
    file,
    ownerUid: owner.uid,
    companyId: owner.companyId,
    localFindings: null,
    analysis: null,
    artifacts: [],
    error: null,
  };
  jobs.set(job.id, job);
  publish(job);
  return job;
}

export function beginAdvisorJob(
  id: string,
  localFindings: LocalWorkforceFindings,
): AdvisorJob | null {
  const job = jobs.get(id);
  if (!job || job.status === "completed" || job.status === "failed") return job ?? null;
  job.status = "running";
  job.progress = "Running Zoreva checks…";
  job.localFindings = localFindings;
  jobs.set(id, job);
  publish(job);
  return job;
}

export function getAdvisorJob(id: string): AdvisorJob | null {
  return jobs.get(id) ?? null;
}

export function getAdvisorJobForOwner(id: string, uid: string): AdvisorJob | null {
  const job = jobs.get(id) ?? null;
  if (!job || job.ownerUid !== uid) return null;
  return job;
}

export function startJobRun(id: string, progress: string): AdvisorJob | null {
  const job = jobs.get(id);
  if (!job) return null;
  job.status = "running";
  job.progress = progress;
  jobs.set(id, job);
  publish(job);
  return job;
}

export function setJobProgress(
  id: string,
  progress: string,
  infiniTaskId?: string,
): AdvisorJob | null {
  const job = jobs.get(id);
  if (!job) return null;
  job.progress = progress;
  if (infiniTaskId) job.infiniTaskId = infiniTaskId;
  jobs.set(id, job);
  publish(job);
  return job;
}

export function completeJob(
  id: string,
  input: {
    infiniTaskId: string;
    localFindings: LocalWorkforceFindings;
    analysis: AdvisorAnalysis;
    artifacts: string[];
  },
): AdvisorJob | null {
  const job = jobs.get(id);
  if (!job) return null;
  job.status = "completed";
  job.progress = "Done";
  job.infiniTaskId = input.infiniTaskId;
  job.localFindings = input.localFindings;
  job.analysis = input.analysis;
  job.artifacts = input.artifacts;
  job.error = null;
  job.file = { ...job.file, bytes: new Uint8Array() };
  jobs.set(id, job);
  publish(job);
  return job;
}

export function failJob(
  id: string,
  error: string,
  extra?: {
    infiniTaskId?: string;
    localFindings?: LocalWorkforceFindings;
  },
): AdvisorJob | null {
  const job = jobs.get(id);
  if (!job) return null;
  job.status = "failed";
  job.progress = "Failed";
  job.error = error;
  if (extra?.infiniTaskId) job.infiniTaskId = extra.infiniTaskId;
  if (extra?.localFindings) job.localFindings = extra.localFindings;
  job.file = { ...job.file, bytes: new Uint8Array() };
  jobs.set(id, job);
  publish(job);
  return job;
}
