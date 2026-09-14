import { RequireAuth } from "@/components/auth/require-auth";

export default function SetupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <RequireAuth allowedRole="ADMIN">
      <div className="flex min-h-full flex-1 flex-col items-center justify-start px-4 py-10 sm:justify-center sm:px-6 sm:py-12">
        <p className="font-mono text-lg font-semibold tracking-[0.18em] text-foreground uppercase sm:tracking-[0.2em]">
          Zoreva
        </p>
        <div className="mt-8 w-full max-w-md sm:mt-10">{children}</div>
      </div>
    </RequireAuth>
  );
}
