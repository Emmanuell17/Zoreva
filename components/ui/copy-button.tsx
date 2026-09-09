"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/copy-text";

type CopyButtonProps = {
  text: string;
  label?: string;
  copiedLabel?: string;
  size?: "sm" | "md";
  variant?: "secondary" | "ghost";
  className?: string;
};

export function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "Copied",
  size = "sm",
  variant = "secondary",
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyText(text);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={className}
      onClick={handleCopy}
    >
      {copied ? copiedLabel : label}
    </Button>
  );
}
