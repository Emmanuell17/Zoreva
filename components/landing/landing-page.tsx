import Link from "next/link";

const steps = [
  {
    title: "Choose",
    body: "Pick an open shift from your phone.",
  },
  {
    title: "Confirm",
    body: "Say you are coming before it starts.",
  },
  {
    title: "Hours",
    body: "Enter the time you worked after the shift.",
  },
];

export function LandingPage() {
  return (
    <div className="relative flex min-h-dvh flex-1 flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(255,255,255,0.07),transparent)]"
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <p className="text-sm font-medium tracking-tight">Zoreva</p>
        <Link
          href="/login"
          className="inline-flex min-h-10 items-center text-sm text-zinc-400 transition-colors hover:text-foreground"
        >
          Log in
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-12 sm:px-10 sm:py-16">
        <div className="animate-[fade-up_0.7s_ease-out_both]">
          <h1 className="max-w-xl text-[2.35rem] leading-[1.08] font-medium tracking-tight text-balance sm:text-6xl sm:leading-[1.05]">
            Shifts, confirmations, and hours in one place.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-zinc-400 sm:mt-6 sm:text-lg">
            Workers choose a shift and confirm they are coming. After the
            shift they enter hours. Managers see who signed up and what was
            submitted.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center">
            <Link
              href="/register"
              className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-zinc-200"
            >
              Get started
            </Link>
            <Link
              href="/join"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-700 px-5 text-sm font-medium transition-colors hover:bg-zinc-900"
            >
              Join a team
            </Link>
          </div>
        </div>

        <ol className="mt-16 grid gap-8 border-t border-zinc-800 pt-8 sm:mt-20 sm:grid-cols-3 sm:gap-10">
          {steps.map((step, index) => (
            <li key={step.title}>
              <p className="font-mono text-xs tracking-wide text-zinc-500">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h2 className="mt-3 text-sm font-medium">{step.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
