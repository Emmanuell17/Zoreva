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
import type { AdvisorJobPublic } from "@/lib/advisor/types";

type HealthResponse = {
  configured: boolean;
  reachable: boolean;
  error?: string;
};

function isBusyMessage(error: string | null | undefined): boolean {
  return Boolean(error && (/busy/i.test(error) || /服务器繁忙/.test(error)));
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function statusCopy(job: AdvisorJobPublic): { label: string; variant: "success" | "warning" | "pending" | "default" } {
  if (job.status === "completed") return { label: "Complete", variant: "success" };
  if (job.status === "running" || job.status === "queued") return { label: "Running", variant: "pending" };
  if (isBusyMessage(job.error)) return { label: "Compute busy", variant: "warning" };
  return { label: "Needs another try", variant: "warning" };
}

export function AdminAdvisorPanel() {
  const { user, configured } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState<AdvisorJobPublic | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const signedIn = Boolean(configured && user);
  const busy = submitting || job?.status === "queued" || job?.status === "running";

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

  function chooseFile(next: File | null) {
    setFile(next);
    setError(null);
  }

  async function startAnalysis() {
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
    } catch (caught) {
      const cancelled = caught instanceof Error && caught.name === "AbortError";
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

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    void startAnalysis();
  }

  function handleCancel() {
    setJob((current) => failIfUnfinished(current, "The analysis was cancelled."));
    setSubmitting(false);
    abortRef.current?.abort();
  }

  const connection = connectionState({ signedIn, health });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Operations advisor"
        description="Drop in a roster or hours export. Zoreva checks the rows immediately. InfiniSynapse adds advisory findings and does not change the schedule."
        actions={<ConnectionPill state={connection} />}
      />

      <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
        <label
          onDragOver={(event) => {
            event.preventDefault();
            if (!busy) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            if (busy) return;
            chooseFile(event.dataTransfer.files?.[0] ?? null);
          }}
          className={`group relative flex min-h-52 cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border bg-surface p-5 text-left transition-colors ${
            dragOver
              ? "border-foreground/70 bg-zinc-900"
              : "border-border hover:border-zinc-500"
          } ${busy ? "cursor-progress" : ""}`}
        >
          <input
            ref={inputRef}
            type="file"
            name="file"
            accept=".csv,.xlsx,.xls"
            className="sr-only"
            disabled={busy}
            onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
          />
          <div>
            <p className="text-[11px] font-medium tracking-[0.16em] text-zinc-500 uppercase">
              Workforce file
            </p>
            <p className="mt-3 max-w-md text-lg font-medium tracking-tight text-foreground">
              {file ? file.name : "Drop a CSV or Excel file"}
            </p>
            <p className="mt-1.5 text-sm text-zinc-500">
              {file
                ? formatBytes(file.size)
                : "Up to 5 MB. A sample lives in docs/samples/workforce-sample.csv."}
            </p>
          </div>
          <div className="mt-8 flex items-center justify-between gap-3">
            <span className="text-xs text-zinc-500">
              {dragOver ? "Release to attach" : "Click or drag to replace"}
            </span>
            <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-zinc-400">
              CSV · XLSX
            </span>
          </div>
        </label>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>What happens next</CardTitle>
            <CardDescription>
              Local checks stay in Zoreva. InfiniSynapse only writes the advisory report.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ol className="flex flex-col gap-3 text-sm text-zinc-300">
              <Step n="1" title="Read the sheet" detail="Missing fields, bad rows, and staffing gaps." />
              <Step n="2" title="Ask InfiniSynapse" detail="The same file, checked again as advice." />
              <Step n="3" title="Leave the schedule alone" detail="Nothing here books, edits, or deletes a shift." />
            </ol>
            {error ? <p className="text-xs leading-relaxed text-red-300">{error}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm" loading={submitting} disabled={busy || !file}>
                Analyze file
              </Button>
              {busy ? (
                <Button type="button" size="sm" variant="secondary" onClick={handleCancel}>
                  Stop
                </Button>
              ) : job ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void startAnalysis()}
                  disabled={!file}
                >
                  Run again
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </form>

      {connection.tone === "warn" ? (
        <p
          role="status"
          className="rounded-2xl border border-amber-900/70 bg-amber-950/40 px-4 py-3 text-sm leading-relaxed text-amber-100"
        >
          {connection.detail}
        </p>
      ) : null}

      {!job ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Hint title="Missing" detail="Blank names, roles, or hours the sheet should already have." />
          <Hint title="Inconsistent" detail="Rows that disagree with each other or with a shift." />
          <Hint title="Staffing" detail="Coverage that looks thin before anyone is booked." />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{job.filename}</p>
                <p className="mt-1 text-sm text-zinc-400">{job.progress}</p>
              </div>
              <Badge variant={statusCopy(job).variant}>{statusCopy(job).label}</Badge>
            </div>
            {busy ? <ProgressRail progress={job.progress} /> : null}
            {job.error ? (
              <div
                role="status"
                className="rounded-xl border border-amber-900/70 bg-amber-950/35 px-4 py-3"
              >
                <p className="text-sm font-medium text-amber-100">
                  {isBusyMessage(job.error)
                    ? "InfiniSynapse is busy right now"
                    : "The advisory pass did not finish"}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-amber-100/80">{job.error}</p>
              </div>
            ) : null}
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            {job.localFindings ? (
              <FindingsCard
                title="Zoreva checks"
                description={`Deterministic scan of ${job.localFindings.rowCount} rows.`}
                groups={[
                  { title: "Missing", items: job.localFindings.missingInformation },
                  {
                    title: "Inconsistent",
                    items: job.localFindings.inconsistentRecords.map(
                      (item) => `Row ${item.row}: ${item.issue}`,
                    ),
                  },
                  { title: "Staffing", items: job.localFindings.staffingIssues },
                ]}
              />
            ) : null}

            {job.analysis ? (
              <FindingsCard
                title="InfiniSynapse analysis"
                description="Validated advice. It does not change shifts, signups, or hours."
                summary={job.analysis.summary}
                groups={[
                  { title: "Missing", items: job.analysis.missingInformation },
                  {
                    title: "Inconsistent",
                    items: job.analysis.inconsistentRecords.map(
                      (item) => `Row ${item.row}: ${item.issue}`,
                    ),
                  },
                  { title: "Staffing", items: job.analysis.staffingIssues },
                  { title: "Recommendations", items: job.analysis.recommendations },
                ]}
                footer={
                  job.artifacts.length > 0
                    ? `Workspace files: ${job.artifacts.join(", ")}`
                    : undefined
                }
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function connectionState({
  signedIn,
  health,
}: {
  signedIn: boolean;
  health: HealthResponse | null;
}): { label: string; detail: string; tone: "ok" | "wait" | "warn" } {
  if (!signedIn) {
    return {
      label: "Sign in",
      detail: "Sign in as a manager to use the advisor.",
      tone: "warn",
    };
  }
  if (!health) {
    return { label: "Checking", detail: "Checking the advisor connection.", tone: "wait" };
  }
  if (!health.reachable) {
    return {
      label: "Offline",
      detail: health.error ?? "InfiniSynapse is not available yet.",
      tone: "warn",
    };
  }
  return { label: "Ready", detail: "The advisor can reach InfiniSynapse.", tone: "ok" };
}

function ConnectionPill({
  state,
}: {
  state: { label: string; tone: "ok" | "wait" | "warn" };
}) {
  const dot =
    state.tone === "ok"
      ? "bg-emerald-400"
      : state.tone === "warn"
        ? "bg-amber-400"
        : "bg-zinc-500";
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-zinc-300">
      <span className={`size-1.5 rounded-full ${dot}`} />
      {state.label}
    </span>
  );
}

function Step({ n, title, detail }: { n: string; title: string; detail: string }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-border text-[10px] text-zinc-400">
        {n}
      </span>
      <span>
        <span className="block text-sm text-foreground">{title}</span>
        <span className="block text-xs leading-relaxed text-zinc-500">{detail}</span>
      </span>
    </li>
  );
}

function Hint({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-4">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">{detail}</p>
    </div>
  );
}

function ProgressRail({ progress }: { progress: string }) {
  const steps = ["Connect", "Upload", "Analyze", "Read results"];
  const active = progressStep(progress);
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {steps.map((step, index) => {
        const done = index < active;
        const current = index === active;
        return (
          <li
            key={step}
            className={`rounded-xl border px-3 py-2 text-xs ${
              current
                ? "border-foreground/40 bg-zinc-900 text-foreground"
                : done
                  ? "border-border text-zinc-300"
                  : "border-border text-zinc-600"
            }`}
          >
            {step}
          </li>
        );
      })}
    </ol>
  );
}

function progressStep(progress: string): number {
  const text = progress.toLowerCase();
  if (text.includes("reading") || text.includes("result")) return 3;
  if (text.includes("analy") || text.includes("busy") || text.includes("trying again")) return 2;
  if (text.includes("upload")) return 1;
  return 0;
}

function FindingsCard({
  title,
  description,
  summary,
  groups,
  footer,
}: {
  title: string;
  description: string;
  summary?: string;
  groups: Array<{ title: string; items: string[] }>;
  footer?: string;
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {summary ? <p className="text-sm leading-relaxed text-zinc-200">{summary}</p> : null}
        {groups.map((group) => (
          <FindingList key={group.title} title={group.title} items={group.items} />
        ))}
        {footer ? <p className="text-xs text-zinc-600">{footer}</p> : null}
      </CardContent>
    </Card>
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
    progress: "Stopped",
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
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium tracking-[0.14em] text-zinc-500 uppercase">{title}</p>
        <p className="text-[11px] text-zinc-600">{items.length}</p>
      </div>
      {items.length === 0 ? (
        <p className="mt-1.5 text-xs text-zinc-600">None found.</p>
      ) : (
        <ul className="mt-1.5 space-y-1.5">
          {items.map((item) => (
            <li
              key={item}
              className="rounded-lg border border-border/80 bg-background/40 px-3 py-2 text-xs leading-relaxed text-zinc-300"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
