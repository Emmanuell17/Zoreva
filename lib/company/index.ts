import { SETUP_PATH } from "@/lib/company/defaults";
import { hasCompletedSetup } from "@/lib/company/persistence";
import { homePathForRole, isAppPath } from "@/lib/firebase/auth";
import type { Role } from "@/types";

export { SETUP_PATH, LOCAL_OWNER_ID, defaultShiftTemplates, templateDefaults } from "@/lib/company/defaults";
export { hasCompletedSetup } from "@/lib/company/persistence";
export {
  activateDemoWorkspace,
  activateWorkspaceForOwner,
  createCompanyWorkspace,
  getActiveCompany,
  getActiveEmployees,
  ownerIdFromAuth,
  persistActiveSchedule,
  registerScheduleBridge,
  subscribeCompany,
} from "@/lib/company/store";

export function resolveAppPath(
  role: Role | null,
  ownerId: string | null | undefined,
  requested?: string | null,
): string {
  if (role === "ADMIN") {
    if (!hasCompletedSetup(ownerId)) return SETUP_PATH;
    if (!requested || requested === SETUP_PATH || !isAppPath(requested)) {
      return "/admin";
    }
    if (requested.startsWith("/admin")) return requested;
    return "/admin";
  }

  if (requested && requested.startsWith("/employee") && isAppPath(requested)) {
    return requested;
  }

  return homePathForRole(role);
}
