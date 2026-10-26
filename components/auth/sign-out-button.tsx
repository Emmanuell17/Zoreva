"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type SignOutButtonProps = {
  className?: string;
};

export function SignOutButton({ className }: SignOutButtonProps) {
  const router = useRouter();
  const { configured, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  function close() {
    if (signingOut) return;
    setOpen(false);
  }

  async function handleConfirm() {
    if (!configured) {
      router.push("/login");
      return;
    }

    setSigningOut(true);
    try {
      await signOut();
      router.push("/login");
    } finally {
      setSigningOut(false);
      setOpen(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className={className}
      >
        Sign out
      </Button>
      <Modal
        open={open}
        onClose={close}
        title="Are you sure you want to sign out?"
      >
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={signingOut}
            onClick={close}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={signingOut}
            onClick={() => void handleConfirm()}
          >
            Sign out
          </Button>
        </div>
      </Modal>
    </>
  );
}
