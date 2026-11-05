"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useCompany } from "@/hooks/use-company";
import { deleteActiveCompany } from "@/lib/company/store";

export function DeleteCompanySection() {
  const router = useRouter();
  const company = useCompany();
  const { user, configured, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!company) return null;
  const companyName = company.companyName;
  const matches = typed.trim() === companyName.trim();

  function close() {
    if (deleting) return;
    setOpen(false);
    setTyped("");
    setError(null);
  }

  async function handleDelete() {
    if (!matches) return;
    setDeleting(true);
    setError(null);
    const result = await deleteActiveCompany({ confirmName: typed, authEmail: user?.email });
    if (!result.ok) {
      setError(result.reason);
      setDeleting(false);
      return;
    }
    if (configured) await signOut();
    router.push("/login");
  }

  return (
    <section className="mt-12">
      <Card className="border-red-900/60">
        <CardHeader>
          <CardTitle>Delete company</CardTitle>
          <CardDescription>
            Permanently removes {companyName}, its rota, hours, availability and time off for
            everyone. Your team loses access, and this Google account is free to create or join
            another company.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
            Delete company
          </Button>
        </CardContent>
      </Card>

      <Modal
        open={open}
        onClose={close}
        title={`Delete ${companyName}?`}
        description="This cannot be undone. Every shift, hours record and team link for this company is removed."
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleDelete();
          }}
        >
          <Input
            name="confirm-company-name"
            label={`Type ${companyName} to confirm`}
            autoComplete="off"
            value={typed}
            disabled={deleting}
            onChange={(event) => setTyped(event.target.value)}
          />
          {error ? (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" disabled={deleting} onClick={close}>
              Keep company
            </Button>
            <Button type="submit" variant="danger" size="sm" loading={deleting} disabled={!matches}>
              Delete company
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
