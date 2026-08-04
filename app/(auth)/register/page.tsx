import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="text-center">
      <h1 className="text-lg font-medium tracking-tight text-foreground">
        Create account
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        Register as an employee or manager.
      </p>
      <p className="mt-8 text-sm text-zinc-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-zinc-300 underline-offset-4 hover:text-foreground hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
