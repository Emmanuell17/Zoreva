"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { AdvisorJobPublic } from "@/lib/advisor/types";

type HealthResponse = {
  configured: boolean;
  reachable: boolean;
  error?: string;
};

function badgeForStatus(status: AdvisorJobPublic["status"]) {
  if (status === "completed") return "success" as const;
  if (status === "failed") return "warning" as const;
  if (status === "running") return "pending" as const;
  return "default" as const;
}

export function AdminAdvisorPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState<AdvisorJobPublic | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/advisor/health")
      .then(async (response) => {
        const body = (await response.json()) as HealthResponse;
        if (!cancelled) setHealth(body);
      })
      .catch(() => {
        if (!cancelled) {
          setHealth({
            configured: false,
            reachable: false,
            error: "Could not reach the Zoreva advisor API.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!job || job.status === "completed" || job.status === "failed") return;
    const timer = window.setInterval(() => {
      void fetch(`/api/advisor/${job.id}`)
        .then(async (response) => {
          const body = (await response.json()) as { job?: AdvisorJobPublic; error?: string };
          if (body.job) setJob(body.job);
        })
        .catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [job]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!file) {
      setError("Choose a CSV or Excel file first.");
      return;
    }

    setSubmitting(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await fetch("/api/advisor/analyze", {
        method: "POST",
        body: form,
      });
      const body = (await response.json()) as { job?: AdvisorJobPublic; error?: string };
      if (!response.ok || !body.job) {
        setError(body.error ?? "Could not start the analysis.");
        return;
      }
      setJob(body.job);
    } catch {
      setError("Could not start the analysis.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!job) return;
    const response = await fetch(`/api/advisor/${job.id}/cancel`, { method: "POST" });
    const body = (await response.json()) as { job?: AdvisorJobPublic };
    if (body.job) setJob(body.job);
  }

  const busy = submitting || job?.status === "queued" || job?.status === "running";

  return (
    <div>
      <PageHeader
        title="Operations advisor"
        description="Upload a workforce CSV or Excel file. InfiniSynapse reads it for missing, inconsistent, and staffing issues. Zoreva still owns booking rules and the real schedule."
      />

      {health && !health.reachable ? (
        <p
          role="status"
          className="mb-4 rounded-md border border-amber-900/80 bg-amber-950/50 px-3 py-2 text-xs leading-relaxed text-amber-200"
        >
          {health.error ?? "InfiniSynapse is not available yet."}
        </p>
      ) : null}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1.5 text-left">
          <span className="text-xs font-medium text-zinc-400">Workforce file</span>
          <input
            type="file"
            name="file"
            accept=".csv,.xlsx,.xls"
            className="text-sm text-zinc-300 file:mr-3 file:rounded-md file:border file:border-border file:bg-zinc-900 file:px-3 file:py-1.5 file:text-xs file:text-foreground"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <span className="text-xs text-zinc-600">
            CSV or Excel, up to 5 MB. A sample file is in docs/samples/workforce-sample.csv.
          </span>
        </label>
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" loading={submitting} disabled={busy}>
            Analyze with InfiniSynapse
          </Button>
          {job && (job.status === "queued" || job.status === "running") ? (
            <Button type="button" size="sm" variant="secondary" onClick={() => void handleCancel()}>
              Stop
            </Button>
          ) : null}
        </div>
      </form>

      {!job ? (
        <div className="mt-6 rounded-md border border-border bg-surface">
          <EmptyState
            title="No analysis yet"
            description="Upload a roster or hours export. Local checks run in Zoreva; InfiniSynapse writes the advisory findings."
          />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={badgeForStatus(job.status)}>{job.status}</Badge>
            <p className="text-xs text-zinc-500">{job.progress}</p>
          </div>

          {job.error ? (
            <p
              role="status"
              className="rounded-md border border-amber-900/80 bg-amber-950/50 px-3 py-2 text-xs leading-relaxed text-amber-200"
            >
              {job.error}
            </p>
          ) : null}

          {job.localFindings ? (
            <Card>
              <CardHeader>
                <CardTitle>Zoreva checks</CardTitle>
                <CardDescription>
                  Deterministic scan of {job.localFindings.rowCount} rows. These are not InfiniSynapse results.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm text-zinc-300">
                <FindingList
                  title="Missing"
                  items={job.localFindings.missingInformation}
                />
                <FindingList
                  title="Inconsistent"
                  items={job.localFindings.inconsistentRecords.map(
                    (item) => `Row ${item.row}: ${item.issue}`,
                  )}
                />
                <FindingList title="Staffing" items={job.localFindings.staffingIssues} />
              </CardContent>
            </Card>
          ) : null}

          {job.analysis ? (
            <Card>
              <CardHeader>
                <CardTitle>InfiniSynapse analysis</CardTitle>
                <CardDescription>
                  Validated JSON from InfiniSynapse. It does not change shifts, signups, or hours.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm text-zinc-300">
                <p>{job.analysis.summary}</p>
                <FindingList title="Missing" items={job.analysis.missingInformation} />
                <FindingList
                  title="Inconsistent"
                  items={job.analysis.inconsistentRecords.map(
                    (item) => `Row ${item.row}: ${item.issue}`,
                  )}
                />
                <FindingList title="Staffing" items={job.analysis.staffingIssues} />
                <FindingList title="Recommendations" items={job.analysis.recommendations} />
                {job.artifacts.length > 0 ? (
                  <p className="text-xs text-zinc-600">
                    Workspace files: {job.artifacts.join(", ")}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}

function FindingList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">{title}</p>
      {items.length === 0 ? (
        <p className="mt-1 text-xs text-zinc-600">None found.</p>
      ) : (
        <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-zinc-300">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
