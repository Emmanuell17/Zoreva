import { JOIN_PATH, SETUP_PATH } from "@/lib/company/defaults";
import { hasCompletedSetup, hasJoinedCompany } from "@/lib/company/persistence";
import { isJoinPath, joinCodeFromPath } from "@/lib/company/join-code";
import { homePathForRole, isAppPath } from "@/lib/firebase/auth";
import type { Role } from "@/types";

export { SETUP_PATH, JOIN_PATH, LOCAL_OWNER_ID, defaultShiftTemplates, templateDefaults } from "@/lib/company/defaults";
export { hasCompletedSetup, hasJoinedCompany } from "@/lib/company/persistence";
export {
  formatJoinCode,
  inviteUrlForCode,
  isJoinPath,
  joinCodeFromPath,
  joinPathForCode,
  normalizeJoinCode,
} from "@/lib/company/join-code";
export {
  activateDemoWorkspace,
  activateWorkspaceForMember,
  activateWorkspaceForOwner,
  createCompanyWorkspace,
  getActiveCompany,
  getActiveEmployees,
  getCurrentEmployeeId,
  hasJoinedCompany as hasJoinedActiveCompany,
  hydrateWorkspace,
  joinCompanyWithCode,
  ownerIdFromAuth,
  persistActiveSchedule,
  persistNewCompanyWorkspace,
  registerScheduleBridge,
  subscribeCompany,
  updateShiftTemplateTimes,
} from "@/lib/company/store";

export function resolveAppPath(
  role: Role | null,
  userId: string | null | undefined,
  requested?: string | null,
  email?: string | null,
): string {
  if (role === "ADMIN") {
    if (!hasCompletedSetup(userId, email)) return SETUP_PATH;
    if (!requested || requested === SETUP_PATH || !isAppPath(requested)) {
      return "/admin";
    }
    if (requested.startsWith("/admin")) return requested;
    return "/admin";
  }

  if (role === "EMPLOYEE") {
    if (!hasJoinedCompany(userId)) {
      if (requested && isJoinPath(requested)) return requested;
      return JOIN_PATH;
    }
    if (requested && isJoinPath(requested)) return "/employee";
    if (requested && requested.startsWith("/employee") && isAppPath(requested)) {
      return requested;
    }
    return "/employee";
  }

  if (requested && isJoinPath(requested)) {
    return joinCodeFromPath(requested)
      ? `/join/${joinCodeFromPath(requested)}`
      : JOIN_PATH;
  }

  return homePathForRole(role);
}
