export function normalizeEmail(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}
