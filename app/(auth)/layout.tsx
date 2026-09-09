import Link from "next/link";
import { AuthGate } from "@/components/auth/auth-gate";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-start px-4 py-10 sm:justify-center sm:px-6 sm:py-12">
      <Link
        href="/"
        className="font-mono text-lg font-semibold tracking-[0.18em] text-foreground uppercase sm:tracking-[0.2em]"
      >
        Zoreva
      </Link>
      <div className="mt-8 w-full max-w-sm sm:mt-10">
        <AuthGate>{children}</AuthGate>
      </div>
    </div>
  );
}
