"use client";

import { useMemo } from "react";
import { CopyButton } from "@/components/ui/copy-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatJoinCode, inviteUrlForCode } from "@/lib/company/join-code";
import { useCompany } from "@/hooks/use-company";

export function AdminInviteCard() {
  const company = useCompany();
  const code = company?.joinCode ?? "";
  const formatted = formatJoinCode(code);
  const inviteUrl = useMemo(
    () => (code ? inviteUrlForCode(code) : ""),
    [code],
  );
  const qrUrl = inviteUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&bgcolor=0a0a0a&color=ededed&data=${encodeURIComponent(inviteUrl)}`
    : "";

  if (!code) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite your team</CardTitle>
        <CardDescription>
          People sign in as Employee, then enter this code or open the link.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-2xl tracking-[0.2em] text-foreground">
            {formatted}
          </p>
          <p className="mt-2 break-all text-xs text-zinc-500">{inviteUrl}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyButton text={formatted} label="Copy code" />
            <CopyButton text={inviteUrl} label="Copy link" />
          </div>
        </div>
        {qrUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote QR for invite links
          <img
            src={qrUrl}
            alt="QR code for the invite link"
            width={128}
            height={128}
            className="h-32 w-32 rounded-md border border-border bg-zinc-950"
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
