"use client";

import { Button } from "@/components/ui/button";

type GoogleSignInButtonProps = {
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  onClick: () => void;
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-.9 2.4-1.9 3.1l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.3-.2-1.9H12z"
      />
      <path
        fill="#34A853"
        d="M6.6 14.3l-.7.5-2.3 1.8C5.1 19.4 8.3 21.4 12 21.4c2.4 0 4.4-.8 5.9-2.2l-3.1-2.4c-.8.6-1.9.9-2.8.9-2.2 0-4-1.5-4.7-3.4z"
      />
      <path
        fill="#4A90E2"
        d="M3.6 7.4C2.9 8.8 2.6 10.3 2.6 12s.3 3.2 1 4.6l3-2.3c-.2-.6-.3-1.2-.3-1.9s.1-1.4.3-2z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.3c1.3 0 2.5.5 3.4 1.3l2.6-2.6C16.4 2.5 14.4 1.6 12 1.6 8.3 1.6 5.1 3.6 3.6 7.4l3 2.3C7.9 6.8 9.8 5.3 12 5.3z"
      />
    </svg>
  );
}

export function GoogleSignInButton({
  loading = false,
  disabled = false,
  label = "Continue with Google",
  onClick,
}: GoogleSignInButtonProps) {
  return (
    <Button
      type="button"
      variant="secondary"
      loading={loading}
      disabled={disabled || loading}
      onClick={onClick}
      className="w-full"
    >
      {!loading ? <GoogleIcon /> : null}
      {loading ? "Connecting…" : label}
    </Button>
  );
}
