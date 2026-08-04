import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="text-center">
      <h1 className="text-lg font-medium tracking-tight text-foreground">
        Log in
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        Sign in to manage availability and shifts.
      </p>
      <p className="mt-8 text-sm text-zinc-500">
        No account?{" "}
        <Link
          href="/register"
          className="text-zinc-300 underline-offset-4 hover:text-foreground hover:underline"
        >
          Register
        </Link>
      </p>
      <div className="mt-6 flex flex-col gap-2 text-xs text-zinc-600">
        <Link href="/employee" className="hover:text-zinc-400">
          Employee dashboard →
        </Link>
        <Link href="/manager" className="hover:text-zinc-400">
          Manager dashboard →
        </Link>
      </div>
    </div>
  );
}
