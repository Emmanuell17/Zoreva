import { JoinCompanyForm } from "@/components/join/join-company-form";
import { normalizeJoinCode } from "@/lib/company/join-code";

export default async function JoinCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <JoinCompanyForm key={code} initialCode={normalizeJoinCode(code)} />;
}
