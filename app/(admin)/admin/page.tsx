import { AdminShiftsPanel } from "@/components/admin/admin-shifts-panel";
import { DeleteCompanySection } from "@/components/admin/delete-company-section";

export default function AdminHomePage() {
  return (
    <>
      <AdminShiftsPanel />
      <DeleteCompanySection />
    </>
  );
}
