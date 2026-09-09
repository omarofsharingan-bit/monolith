import { dict } from "@/lib/i18n";
import type { UserRole } from "@/lib/domain";

/** Arabic label for each account role. */
export const ROLE_LABEL: Record<UserRole, string> = {
  treasurer: dict.roles.treasurer,
  founder: dict.roles.founder,
  member: dict.roles.member,
};
