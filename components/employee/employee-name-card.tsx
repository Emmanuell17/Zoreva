"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCompany } from "@/hooks/use-company";
import { useCurrentEmployeeId } from "@/hooks/use-current-employee";
import { MAX_NAME_LENGTH, updateOwnName } from "@/lib/company/store";

export function EmployeeNameCard() {
  const company = useCompany();
  const employeeId = useCurrentEmployeeId();
  const current = company?.employees.find((employee) => employee.id === employeeId)?.name ?? "";
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!company || !current) return null;

  const editing = draft !== null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (draft === null) return;
    setSaving(true);
    setError(null);
    const result = await updateOwnName(draft);
    setSaving(false);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setDraft(null);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your name</CardTitle>
        <CardDescription>This is the name your manager sees on the rota.</CardDescription>
      </CardHeader>
      <CardContent>
        {editing ? (
          <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
            <Input
              name="displayName"
              label="Name"
              value={draft}
              maxLength={MAX_NAME_LENGTH}
              autoComplete="name"
              autoFocus
              onChange={(event) => {
                setDraft(event.target.value);
                setError(null);
              }}
              error={error ?? undefined}
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" loading={saving}>
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={saving}
                onClick={() => {
                  setDraft(null);
                  setError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-sm text-foreground">{current}</p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setDraft(current);
                setSaved(false);
              }}
            >
              {saved ? "Saved" : "Edit"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
