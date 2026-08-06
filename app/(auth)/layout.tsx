import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-12">
      <Link
        href="/"
        className="font-mono text-lg font-semibold tracking-[0.2em] text-foreground uppercase"
      >
        Zoreva
      </Link>
      <div className="mt-10 w-full max-w-sm">{children}</div>
    </div>
  );
}
