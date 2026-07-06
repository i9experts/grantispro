import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Roles allowed to create/edit scholarship programs and criteria.
// Finance and Donor roles are intentionally excluded here.
const PROGRAM_MANAGER_ROLES = ["INSTITUTION_ADMIN", "OFFICER"];

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session;
}

export function canManagePrograms(role: string) {
  return PROGRAM_MANAGER_ROLES.includes(role);
}
