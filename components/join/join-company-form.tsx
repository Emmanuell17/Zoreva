"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatJoinCode,
  hasJoinedCompany,
  joinCompanyWithCode,
  joinPathForCode,
  normalizeJoinCode,
} from "@/lib/company";
import { getAuthErrorMessage } from "@/lib/firebase/auth";
import { validateJoinCode } from "@/lib/validation";

type JoinCompanyFormProps = {
  initialCode?: string;
};

export function JoinCompanyForm({ initialCode = "" }: JoinCompanyFormProps) {
  const router = useRouter();
  const {
    user,
    role,
    configured,
    ready,
    loading,
    signInWithGoogle,
    signOut,
    setRole,
    redirectError,
    clearRedirectError,
  } = useAuth();
  const [code, setCode] = useState(() => formatJoinCode(initialCode));
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const autoJoined = useRef(false);

  const signedIn = Boolean(configured && user);
  const isManager = role === "ADMIN";

  useEffect(() => {
    if (!ready || loading || !user || role !== "EMPLOYEE") return;
    if (hasJoinedCompany(user.uid)) {
      router.replace("/employee");
    }
  }, [loading, ready, role, router, user]);

  async function completeJoin(nextCode = code) {
    if (!user) return false;
    const invalid = validateJoinCode(nextCode);
    if (invalid) {
      setError(invalid);
      return false;
    }

    setJoining(true);
    setError(null);
    const result = await joinCompanyWithCode({
      userId: user.uid,
      code: nextCode,
      name: user.displayName ?? "Employee",
      email: user.email ?? "",
    });
    setJoining(false);

    if (!result.ok) {
      setError(result.reason);
      return false;
    }

    router.replace("/employee");
    return true;
  }

  useEffect(() => {
    if (autoJoined.current) return;
    if (!ready || loading || !user || isManager || joining) return;
    if (hasJoinedCompany(user.uid)) return;
    const fromLink = normalizeJoinCode(initialCode);
    if (!fromLink) return;
    autoJoined.current = true;
    const timer = window.setTimeout(() => {
      void completeJoin(fromLink);
    }, 0);
    return () => window.clearTimeout(timer);
    // Invite links should attach as soon as Google auth is ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, loading, user, isManager, initialCode]);

  async function handleGoogleSignIn() {
    setError(null);
    clearRedirectError();

    const invalid = validateJoinCode(code);
    if (invalid) {
      setError(invalid);
      return;
    }

    if (!configured) {
      setError(
        "Firebase is not configured. Add your keys to .env.local and restart the app.",
      );
      return;
    }

    setRole("EMPLOYEE");
    setGoogleLoading(true);
    try {
      await signInWithGoogle("EMPLOYEE", joinPathForCode(code));
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const invalid = validateJoinCode(code);
    if (invalid) {
      setError(invalid);
      return;
    }

    if (!signedIn) {
      await handleGoogleSignIn();
      return;
    }

    if (isManager) {
      setError(
        "You are signed in as a manager. Sign out, then join with an employee Google account.",
      );
      return;
    }

    await completeJoin();
  }

  return (
    <div>
      <div className="text-center">
        <h1 className="text-lg font-medium tracking-tight text-foreground">
          Join your team
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Enter the code your manager shared, or open their invite link.
        </p>
      </div>

      <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
        <Input
          name="joinCode"
          label="Join code"
          value={code}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          placeholder="ABC-123"
          onChange={(event) => {
            setCode(formatJoinCode(event.target.value));
            setError(null);
          }}
          error={error ?? undefined}
          hint="6 characters. Letters and numbers."
        />

        {signedIn && !isManager ? (
          <Button type="submit" loading={joining} className="w-full">
            Join company
          </Button>
        ) : isManager ? (
          <div className="grid gap-3">
            <p className="text-xs text-amber-400">
              You are signed in as a manager. Sign out to join a company as an
              employee.
            </p>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                void signOut();
              }}
            >
              Sign out
            </Button>
          </div>
        ) : (
          <GoogleSignInButton
            loading={googleLoading}
            label="Sign in to join"
            onClick={handleGoogleSignIn}
          />
        )}

        {redirectError ? (
          <p className="text-xs text-red-400">{redirectError}</p>
        ) : null}
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Starting your own company?{" "}
        <Link
          href="/register"
          className="text-zinc-300 underline-offset-4 hover:text-foreground hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
