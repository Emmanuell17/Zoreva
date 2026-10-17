import Link from "next/link";
import { FlowPreview } from "@/components/landing/flow-preview";
import { Badge } from "@/components/ui/badge";

const roles = [
  {
    kicker: "For employees",
    title: "Your shifts, in your pocket.",
    points: [
      "Join your team with a code",
      "Choose an open shift in a tap",
      "Confirm before it starts",
      "Send your hours afterwards",
    ],
  },
  {
    kicker: "For managers",
    title: "See who is actually coming.",
    points: [
      "Set up your company in minutes",
      "Create shifts from your own templates",
      "Watch signups turn into confirmations",
      "Review hours and past shifts",
    ],
  },
];

const rules = [
  "No overlapping shifts",
  "Capacity is respected",
  "Past shifts are closed",
  "No duplicate time slots",
  "Hours only for real signups",
  "Shifts clear after their date",
];

const joinSteps = [
  "Manager finishes setup",
  "Shares the 6-letter code",
  "Team joins from their phone",
];

export function LandingPage() {
  return (
    <div className="relative flex min-h-dvh flex-1 flex-col overflow-x-clip">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(255,255,255,0.07),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[44rem] bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
      />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 sm:px-10">
        <p className="text-sm font-medium tracking-tight">Zoreva</p>
        <nav className="flex items-center gap-1 sm:gap-3">
          <Link
            href="/join"
            className="inline-flex min-h-10 items-center px-3 text-sm text-zinc-400 transition-colors hover:text-foreground"
          >
            Join a team
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-10 items-center px-3 text-sm text-zinc-400 transition-colors hover:text-foreground"
          >
            Log in
          </Link>
        </nav>
      </header>

      <main className="relative z-10 flex-1">
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-14 px-6 pt-8 pb-20 sm:px-10 sm:pt-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:pb-28">
          <div className="animate-[fade-up_0.7s_ease-out_both]">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-zinc-400">
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full bg-emerald-400"
              />
              Built for shift teams on the move
            </p>

            <h1 className="mt-6 max-w-xl text-[2.5rem] leading-[1.06] font-medium tracking-tight text-balance sm:text-6xl sm:leading-[1.04]">
              Know who is working{" "}
              <span className="text-zinc-500">before the shift starts.</span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-relaxed text-zinc-400 sm:text-lg">
              Workers choose a shift, confirm they are coming, and enter their
              hours. Managers get a clear view of who signed up, who confirmed,
              and what was worked.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/register"
                className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-zinc-200"
              >
                Get started
              </Link>
              <Link
                href="/join"
                className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-700 px-6 text-sm font-medium transition-colors hover:bg-zinc-900"
              >
                Join with a code
              </Link>
            </div>

            <p className="mt-5 text-xs text-zinc-500">
              Sign in with Google. No password to remember.
            </p>
          </div>

          <div className="animate-[fade-up_0.9s_ease-out_0.15s_both]">
            <FlowPreview />
          </div>
        </section>

        {/* Roles */}
        <section className="border-t border-border">
          <div className="mx-auto grid w-full max-w-6xl gap-px px-6 py-16 sm:px-10 md:grid-cols-2 md:gap-8 md:py-20">
            {roles.map((role) => (
              <div
                key={role.kicker}
                className="rounded-md border border-border bg-surface p-6 sm:p-8"
              >
                <p className="font-mono text-xs tracking-wide text-zinc-500">
                  {role.kicker}
                </p>
                <h2 className="mt-3 text-xl font-medium tracking-tight sm:text-2xl">
                  {role.title}
                </h2>
                <ul className="mt-6 space-y-3">
                  {role.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-3 text-sm text-zinc-300"
                    >
                      <Check />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Join code + Advisor */}
        <section className="border-t border-border bg-surface/40">
          <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-16 sm:px-10 md:grid-cols-2 md:py-20">
            <div className="flex flex-col rounded-md border border-border bg-background p-6 sm:p-8">
              <Badge className="self-start">Join codes</Badge>
              <h2 className="mt-4 text-xl font-medium tracking-tight sm:text-2xl">
                One code. Whole team in.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Every company gets its own private workspace. Share a short code
                and your people land in the right place, even after signing in
                with Google.
              </p>

              <div className="mt-6 rounded-md border border-dashed border-zinc-700 bg-surface px-4 py-6 text-center">
                <p className="text-[11px] tracking-wide text-zinc-500">
                  Your team code
                </p>
                <p className="mt-2 font-mono text-3xl font-medium tracking-[0.2em] sm:text-4xl">
                  K7M-4QP
                </p>
              </div>

              <ol className="mt-6 space-y-2.5">
                {joinSteps.map((step, index) => (
                  <li
                    key={step}
                    className="flex items-center gap-3 text-sm text-zinc-300"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border font-mono text-[10px] text-zinc-400">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex flex-col rounded-md border border-border bg-background p-6 sm:p-8">
              <Badge variant="confirmed" className="self-start">
                Operations Advisor
              </Badge>
              <h2 className="mt-4 text-xl font-medium tracking-tight sm:text-2xl">
                Upload a spreadsheet. Get a second opinion.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Managers can drop in a workforce CSV or Excel file and get
                plain-language checks on coverage, overtime, and gaps. It only
                advises. It never edits your schedule.
              </p>

              <div className="mt-6 space-y-2 rounded-md border border-border bg-surface p-4 font-mono text-xs">
                <div className="flex items-center justify-between text-zinc-500">
                  <span>workforce.csv</span>
                  <span>24 rows</span>
                </div>
                <div className="my-2 h-px bg-border" />
                <Finding tone="warn" text="2 people over 48h this week" />
                <Finding tone="warn" text="Thursday afternoon is short by 1" />
                <Finding tone="ok" text="No overlapping assignments" />
              </div>

              <p className="mt-6 text-xs text-zinc-500">
                Advisory only. Shift rules stay enforced by Zoreva.
              </p>
            </div>
          </div>
        </section>

        {/* Rules */}
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-6xl px-6 py-16 text-center sm:px-10 md:py-20">
            <p className="font-mono text-xs tracking-wide text-zinc-500">
              Built-in rules
            </p>
            <h2 className="mx-auto mt-3 max-w-xl text-xl font-medium tracking-tight text-balance sm:text-3xl">
              The schedule stays clean without anyone policing it.
            </h2>
            <ul className="mx-auto mt-8 flex max-w-2xl flex-wrap justify-center gap-2.5">
              {rules.map((rule) => (
                <li
                  key={rule}
                  className="rounded-full border border-border bg-surface px-4 py-2 text-xs text-zinc-300 sm:text-sm"
                >
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-border">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 py-20 text-center sm:px-10 md:py-28">
            <h2 className="max-w-lg text-3xl font-medium tracking-tight text-balance sm:text-5xl sm:leading-[1.08]">
              Start your first shift in minutes.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-400 sm:text-base">
              Create a company, share the code, and let your team take it from
              there.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-zinc-200"
              >
                Get started
              </Link>
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-700 px-6 text-sm font-medium transition-colors hover:bg-zinc-900"
              >
                Log in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 text-xs text-zinc-500 sm:px-10">
          <p>Zoreva</p>
          <p>Choose. Confirm. Hours.</p>
        </div>
      </footer>
    </div>
  );
}

function Check() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  );
}

function Finding({ tone, text }: { tone: "ok" | "warn"; text: string }) {
  return (
    <p className="flex items-start gap-2">
      <span
        aria-hidden
        className={
          tone === "ok"
            ? "mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400"
            : "mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300"
        }
      />
      <span className="text-zinc-300">{text}</span>
    </p>
  );
}
