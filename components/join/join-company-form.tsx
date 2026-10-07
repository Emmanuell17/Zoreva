"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import { useAuth } from "@/components/auth/auth-provider";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  clearPendingJoinCode,
  formatJoinCode,
  hasJoinedCompany,
  joinCompanyWithCode,
  joinPathForCode,
  normalizeJoinCode,
  peekPendingJoinCode,
  storePendingJoinCode,
} from "@/lib/company";
import {
  getAuthErrorMessage,
  recentGoogleRedirectAttempt,
  usesRedirectGoogleSignIn,
} from "@/lib/firebase/auth";
import { validateJoinCode } from "@/lib/validation";

let joinTask: Promise<boolean> | null = null;

function stripSignInParam() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("signin")) return;
  url.searchParams.delete("signin");
  const next = `${url.pathname}${url.search}${url.hash}`;
  History.prototype.replaceState.call(window.history, window.history.state, "", next);
}

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
  const attemptedCode = useRef<string | null>(null);
  const autoSignInStarted = useRef(false);

  const signedIn = Boolean(configured && user);
  const isManager = role === "ADMIN";

  async function completeJoin(nextCode = code, account: User | null = user) {
    if (joinTask) return joinTask;

    joinTask = (async () => {
      if (!account) return false;
      const invalid = validateJoinCode(nextCode);
      if (invalid) {
        setError(invalid);
        return false;
      }

      setJoining(true);
      setError(null);
      const result = await joinCompanyWithCode({
        userId: account.uid,
        code: nextCode,
        name: account.displayName ?? "Employee",
        email: account.email ?? "",
      });
      setJoining(false);

      if (!result.ok) {
        setError(result.reason);
        return false;
      }

      clearPendingJoinCode();
      router.replace("/employee");
      return true;
    })().finally(() => {
      joinTask = null;
    });

    return joinTask;
  }

  useEffect(() => {
    const pending = peekPendingJoinCode();
    if (!pending) return;
    setCode((current) =>
      normalizeJoinCode(current) ? current : formatJoinCode(pending),
    );
  }, []);

  useEffect(() => {
    if (!ready || loading || !user || role === "ADMIN") return;

    if (hasJoinedCompany(user.uid)) {
      clearPendingJoinCode();
      router.replace("/employee");
      return;
    }

    const fromLink = normalizeJoinCode(initialCode) || peekPendingJoinCode();
    if (!fromLink || attemptedCode.current === fromLink) return;
    attemptedCode.current = fromLink;
    void completeJoin(fromLink, user);
    // Join as soon as Google auth returns with a code from the link or the last attempt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode, loading, ready, role, router, user]);

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

    const nextPath = joinPathForCode(code);
    storePendingJoinCode(code);
    setRole("EMPLOYEE");

    if (usesRedirectGoogleSignIn() && window.location.pathname !== nextPath) {
      window.location.assign(`${nextPath}?signin=1`);
      return;
    }

    if (usesRedirectGoogleSignIn()) {
      stripSignInParam();
    }

    setGoogleLoading(true);
    try {
      const signedInUser = await signInWithGoogle("EMPLOYEE", nextPath);
      if (signedInUser) {
        await completeJoin(normalizeJoinCode(code), signedInUser);
      }
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setGoogleLoading(false);
    }
  }

  const startGoogleJoinRef = useRef(handleGoogleSignIn);
  startGoogleJoinRef.current = handleGoogleSignIn;

  useEffect(() => {
    if (autoSignInStarted.current || !ready || loading || user) return;
    if (!usesRedirectGoogleSignIn()) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("signin") !== "1") return;
    if (recentGoogleRedirectAttempt()) return;
    if (validateJoinCode(code)) return;
    autoSignInStarted.current = true;
    void startGoogleJoinRef.current();
  }, [code, loading, ready, user]);

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
