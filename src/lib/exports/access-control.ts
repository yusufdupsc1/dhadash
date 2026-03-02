/**
 * Export Access Control - RBAC Matrix
 * Defines who can export which data types
 */

import type { ExportType } from "./validation";

export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "PRINCIPAL"
  | "TEACHER"
  | "STAFF"
  | "STUDENT"
  | "PARENT";

/**
 * Defines export permissions per role per export type
 * FORMAT: { role: { exportType: canExport } }
 */
const EXPORT_PERMISSIONS: Record<UserRole, Record<ExportType | "all", boolean>> = {
  SUPER_ADMIN: { STUDENT_LIST: true, ATTENDANCE_REGISTER: true, all: true },
  ADMIN: { STUDENT_LIST: true, ATTENDANCE_REGISTER: true, all: true },
  PRINCIPAL: { STUDENT_LIST: true, ATTENDANCE_REGISTER: true, all: true },
  TEACHER: { STUDENT_LIST: true, ATTENDANCE_REGISTER: true, all: true },
  STAFF: { STUDENT_LIST: false, ATTENDANCE_REGISTER: false, all: false },
  STUDENT: { STUDENT_LIST: false, ATTENDANCE_REGISTER: false, all: false },
  PARENT: { STUDENT_LIST: false, ATTENDANCE_REGISTER: false, all: false },
};

/**
 * Check if a role can perform an export
 * @returns boolean - true if allowed, false otherwise
 */
export function canExport(role: string | undefined, exportType: ExportType): boolean {
  if (!role || !(role in EXPORT_PERMISSIONS)) return false;

  const permissions = EXPORT_PERMISSIONS[role as UserRole];
  return permissions[exportType] === true;
}

/**
 * Scope constraints for exports
 * Defines additional data filters based on role
 */
export interface ExportScope {
  canAccessFullInstitution: boolean;
  allowedClassIds?: string[];
  allowedStudentIds?: string[];
  isTeacher: boolean;
  isStudent: boolean;
  isParent: boolean;
}

/**
 * Determine export scope for a user
 * Used to limit what data they can see in exports
 */
export function getExportScope(
  role: string | undefined,
  userClassIds?: string[],
  userStudentId?: string,
  parentGuardianIds?: string[],
): ExportScope {
  if (!role) {
    return {
      canAccessFullInstitution: false,
      isTeacher: false,
      isStudent: false,
      isParent: false,
    };
  }

  if (["SUPER_ADMIN", "ADMIN", "PRINCIPAL"].includes(role)) {
    return {
      canAccessFullInstitution: true,
      isTeacher: false,
      isStudent: false,
      isParent: false,
    };
  }

  if (role === "TEACHER") {
    return {
      canAccessFullInstitution: false,
      allowedClassIds: userClassIds,
      isTeacher: true,
      isStudent: false,
      isParent: false,
    };
  }

  if (role === "STUDENT") {
    return {
      canAccessFullInstitution: false,
      allowedStudentIds: userStudentId ? [userStudentId] : undefined,
      isTeacher: false,
      isStudent: true,
      isParent: false,
    };
  }

  if (role === "PARENT") {
    return {
      canAccessFullInstitution: false,
      allowedStudentIds: parentGuardianIds,
      isTeacher: false,
      isStudent: false,
      isParent: true,
    };
  }

  // STAFF and others have no export access
  return {
    canAccessFullInstitution: false,
    isTeacher: false,
    isStudent: false,
    isParent: false,
  };
}

/**
 * Build Prisma `where` filter for student exports based on role
 * Prevents unauthorized data access
 */
export function buildStudentExportWhere(scope: ExportScope): Record<string, any> {
  if (scope.canAccessFullInstitution) {
    return {}; // Admin/Principal can see all students
  }

  if (scope.isTeacher && scope.allowedClassIds) {
    return { classId: { in: scope.allowedClassIds } };
  }

  if (scope.isStudent && scope.allowedStudentIds) {
    return { id: { in: scope.allowedStudentIds } };
  }

  if (scope.isParent && scope.allowedStudentIds) {
    // Parents can see their children
    return { id: { in: scope.allowedStudentIds } };
  }

  // Deny by default
  return { id: "__INVALID__" };
}

/**
 * Build Prisma `where` filter for attendance exports based on role
 */
export function buildAttendanceExportWhere(
  scope: ExportScope,
): Record<string, any> {
  if (scope.canAccessFullInstitution) {
    return {}; // Admin/Principal can see all attendance
  }

  if (scope.isTeacher && scope.allowedClassIds) {
    return { classId: { in: scope.allowedClassIds } };
  }

  // Other roles cannot export attendance
  return { id: "__INVALID__" };
}

/**
 * Export access check result
 */
export interface ExportAccessCheck {
  allowed: boolean;
  reason?: string;
}

/**
 * Comprehensive export access check
 * Checks: role permission, rate limit, data scope
 */
export function checkExportAccess(
  role: string | undefined,
  exportType: ExportType,
  scope?: ExportScope,
): ExportAccessCheck {
  // Check basic permission
  if (!canExport(role, exportType)) {
    return {
      allowed: false,
      reason: `Role ${role} cannot export ${exportType}`,
    };
  }

  // For attendance exports, only admin/principal/teacher allowed
  if (exportType === "ATTENDANCE_REGISTER") {
    if (!["SUPER_ADMIN", "ADMIN", "PRINCIPAL", "TEACHER"].includes(role || "")) {
      return {
        allowed: false,
        reason: "Only administrators and teachers can export attendance",
      };
    }
  }

  // Check scope if provided
  if (scope) {
    if (!scope.canAccessFullInstitution) {
      // Check if they have any access
      if (scope.isTeacher && (!scope.allowedClassIds || scope.allowedClassIds.length === 0)) {
        return {
          allowed: false,
          reason: "Teacher not assigned to any classes",
        };
      }

      if ((scope.isStudent || scope.isParent) &&
          (!scope.allowedStudentIds || scope.allowedStudentIds.length === 0)) {
        return {
          allowed: false,
          reason: "No students associated with this account",
        };
      }
    }
  }

  return { allowed: true };
}
