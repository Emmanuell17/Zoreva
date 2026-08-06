import Link from "next/link";

const shifts = [
  { day: "Mon", label: "Morning", top: "18%", left: "8%", width: "18%" },
  { day: "Tue", label: "Mid", top: "34%", left: "28%", width: "16%" },
  { day: "Wed", label: "Close", top: "22%", left: "48%", width: "20%" },
  { day: "Thu", label: "Open", top: "42%", left: "12%", width: "22%" },
  { day: "Fri", label: "Cover", top: "28%", left: "62%", width: "18%" },
  { day: "Sat", label: "Split", top: "48%", left: "40%", width: "24%" },
];

export function LandingPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <section className="relative flex min-h-dvh flex-col overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(39,39,42,0.55),_transparent_55%),linear-gradient(180deg,#0a0a0a_0%,#050505_100%)]"
        />
        <div
          aria-hidden
          className="animate-[grid-drift_28s_linear_infinite] pointer-events-none absolute inset-[-10%] opacity-40 [background-image:linear-gradient(rgba(63,63,70,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(63,63,70,0.35)_1px,transparent_1px)] [background-size:48px_48px]"
        />
        <div
          aria-hidden
          className="animate-[soft-pulse_6s_ease-in-out_infinite] pointer-events-none absolute inset-x-0 bottom-0 h-[58%] bg-[linear-gradient(180deg,transparent,rgba(10,10,10,0.2)_20%,rgba(10,10,10,0.92))]"
        />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[52%] sm:h-[58%]"
        >
          <div className="absolute inset-0 border-t border-zinc-800/80 bg-zinc-950/40 backdrop-blur-[1px]">
            <div className="grid h-10 grid-cols-7 border-b border-zinc-800/80 text-[10px] uppercase tracking-[0.18em] text-zinc-600 sm:text-xs">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div
                  key={day}
                  className="flex items-center justify-center border-r border-zinc-800/60 last:border-r-0"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="relative h-[calc(100%-2.5rem)]">
              {shifts.map((shift) => (
                <div
                  key={`${shift.day}-${shift.label}`}
                  className="absolute rounded-sm border border-zinc-700/70 bg-zinc-900/80 px-2 py-1.5 text-[10px] text-zinc-400 sm:text-xs"
                  style={{
                    top: shift.top,
                    left: shift.left,
                    width: shift.width,
                  }}
                >
                  <span className="block font-medium text-zinc-300">
                    {shift.label}
                  </span>
                  <span className="text-zinc-600">{shift.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <header className="relative z-10 flex items-center justify-end px-6 py-5 sm:px-10">
          <Link
            href="/login"
            className="text-sm text-zinc-400 transition-colors hover:text-foreground"
          >
            Log in
          </Link>
        </header>

        <div className="relative z-10 flex flex-1 flex-col justify-center px-6 pb-40 pt-8 sm:px-10 sm:pb-52">
          <p
            className="animate-[fade-up_0.75s_ease-out_both] font-mono text-4xl font-semibold tracking-[0.22em] text-foreground uppercase sm:text-5xl md:text-6xl"
          >
            Zoreva
          </p>
          <h1
            className="animate-[fade-up_0.75s_ease-out_0.12s_both] mt-6 max-w-xl text-2xl font-medium tracking-tight text-zinc-100 sm:text-3xl"
          >
            Shift coordination that stays clear.
          </h1>
          <p
            className="animate-[fade-up_0.75s_ease-out_0.22s_both] mt-4 max-w-md text-sm leading-relaxed text-zinc-400 sm:text-base"
          >
            Employees share availability. Managers assign shifts. Everyone sees
            the same schedule.
          </p>
          <div
            className="animate-[fade-up_0.75s_ease-out_0.34s_both] mt-8 flex flex-wrap items-center gap-3"
          >
            <Link
              href="/register"
              className="inline-flex h-11 items-center justify-center rounded-md bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-zinc-200"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-700 px-5 text-sm font-medium text-foreground transition-colors hover:bg-zinc-900"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-800 px-6 py-24 sm:px-10">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
            Built for the week ahead.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            Zoreva replaces scattered messages with one place to mark when you
            can work, publish shifts, and keep coverage visible for the whole
            team.
          </p>
        </div>
      </section>

      <section className="border-t border-zinc-800 px-6 py-24 sm:px-10">
        <div className="mx-auto grid max-w-3xl gap-16 sm:grid-cols-2 sm:gap-12">
          <div>
            <h2 className="text-xl font-medium tracking-tight text-foreground">
              For employees
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Submit availability, check assigned shifts, and stay aligned
              without chasing updates.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-medium tracking-tight text-foreground">
              For managers
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              See who is free, fill the schedule, and confirm coverage before
              the week starts.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-800 px-6 py-24 sm:px-10">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
            Start coordinating today.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            Create an account and set up your first week of shifts in minutes.
          </p>
          <div className="mt-8">
            <Link
              href="/register"
              className="inline-flex h-11 items-center justify-center rounded-md bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-zinc-200"
            >
              Create account
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-800 px-6 py-8 sm:px-10">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <p className="font-mono text-xs tracking-[0.2em] text-zinc-600 uppercase">
            Zoreva
          </p>
          <p className="text-xs text-zinc-600">Availability and shift coordination</p>
        </div>
      </footer>
    </div>
  );
}
