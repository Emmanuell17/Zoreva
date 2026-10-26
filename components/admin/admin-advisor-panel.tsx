"use client";

import { useEffect, useRef, useState } from "react";
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
import { useAuth } from "@/components/auth/auth-provider";
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
  const { user, configured } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState<AdvisorJobPublic | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const signedIn = Boolean(configured && user);

  useEffect(() => {
    if (!signedIn || !user) return;
    let cancelled = false;
    void user
      .getIdToken()
      .then((token) =>
        fetch("/api/advisor/health", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      )
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
  }, [signedIn, user]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!file) {
      setError("Choose a CSV or Excel file first.");
      return;
    }

    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    setSubmitting(true);
    setJob(null);
    if (!user) {
      setError("Sign in as a manager to use the advisor.");
      setSubmitting(false);
      return;
    }
    const form = new FormData();
    form.append("file", file);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/advisor/analyze", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
        signal: abort.signal,
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Could not start the analysis.");
        return;
      }
      if (!response.body) {
        setError("Could not start the analysis.");
        return;
      }
      await readAdvisorStream(response.body, setJob);
      setJob((current) => failIfUnfinished(current, "The analysis stopped before it finished."));
    } catch (error) {
      const cancelled = error instanceof Error && error.name === "AbortError";
      setJob((current) =>
        failIfUnfinished(
          current,
          cancelled
            ? "The analysis was cancelled."
            : "The analysis stopped before it finished.",
        ),
      );
      if (!cancelled) setError("Could not start the analysis.");
    } finally {
      if (abortRef.current === abort) abortRef.current = null;
      setSubmitting(false);
    }
  }

  function handleCancel() {
    setJob((current) => failIfUnfinished(current, "The analysis was cancelled."));
    setSubmitting(false);
    abortRef.current?.abort();
  }

  const busy = submitting || job?.status === "queued" || job?.status === "running";

  return (
    <div>
      <PageHeader
        title="Operations advisor"
        description="Upload a workforce CSV or Excel file. InfiniSynapse reads it for missing, inconsistent, and staffing issues. Zoreva still owns booking rules and the real schedule."
      />

      {!signedIn ? (
        <p
          role="status"
          className="mb-4 rounded-md border border-amber-900/80 bg-amber-950/50 px-3 py-2 text-xs leading-relaxed text-amber-200"
        >
          Sign in as a manager to use the advisor.
        </p>
      ) : health && !health.reachable ? (
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
          {busy ? (
            <Button type="button" size="sm" variant="secondary" onClick={handleCancel}>
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

function failIfUnfinished(
  current: AdvisorJobPublic | null,
  message: string,
): AdvisorJobPublic | null {
  if (!current || current.status === "completed" || current.status === "failed") return current;
  return {
    ...current,
    status: "failed",
    progress: "Failed",
    error: current.error ?? message,
  };
}

async function readAdvisorStream(
  body: ReadableStream<Uint8Array>,
  onJob: (job: AdvisorJobPublic) => void,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const line = chunk.split("\n").find((item) => item.startsWith("data:"));
      if (!line) continue;
      onJob(JSON.parse(line.slice(5).trim()) as AdvisorJobPublic);
    }
  }
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
