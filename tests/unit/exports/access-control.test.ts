/**
 * Export Access Control Tests
 * Tests role-based access control and data scoping
 */

import { buildStudentExportWhere, canExport, checkExportAccess, getExportScope } from "@/lib/exports/access-control";
import { describe, expect, it } from "vitest";

describe("Export Access Control", () => {
  describe("canExport", () => {
    it("should allow admins to export any type", () => {
      expect(canExport("SUPER_ADMIN", "STUDENT_LIST")).toBe(true);
      expect(canExport("ADMIN", "STUDENT_LIST")).toBe(true);
      expect(canExport("PRINCIPAL", "STUDENT_LIST")).toBe(true);
      expect(canExport("SUPER_ADMIN", "ATTENDANCE_REGISTER")).toBe(true);
      expect(canExport("ADMIN", "ATTENDANCE_REGISTER")).toBe(true);
      expect(canExport("PRINCIPAL", "ATTENDANCE_REGISTER")).toBe(true);
    });

    it("should allow teachers to export both types", () => {
      expect(canExport("TEACHER", "STUDENT_LIST")).toBe(true);
      expect(canExport("TEACHER", "ATTENDANCE_REGISTER")).toBe(true);
    });

    it("should deny staff exports", () => {
      expect(canExport("STAFF", "STUDENT_LIST")).toBe(false);
      expect(canExport("STAFF", "ATTENDANCE_REGISTER")).toBe(false);
    });

    it("should deny student and parent exports", () => {
      expect(canExport("STUDENT", "STUDENT_LIST")).toBe(false);
      expect(canExport("STUDENT", "ATTENDANCE_REGISTER")).toBe(false);
      expect(canExport("PARENT", "STUDENT_LIST")).toBe(false);
      expect(canExport("PARENT", "ATTENDANCE_REGISTER")).toBe(false);
    });

    it("should deny undefined role", () => {
      expect(canExport(undefined, "STUDENT_LIST")).toBe(false);
    });
  });

  describe("getExportScope", () => {
    it("should give admins full access", () => {
      const scope = getExportScope("ADMIN");
      expect(scope.canAccessFullInstitution).toBe(true);
    });

    it("should restrict teachers to assigned classes", () => {
      const classIds = ["class-1", "class-2"];
      const scope = getExportScope("TEACHER", classIds);
      expect(scope.canAccessFullInstitution).toBe(false);
      expect(scope.allowedClassIds).toEqual(classIds);
      expect(scope.isTeacher).toBe(true);
    });

    it("should restrict students to their own data", () => {
      const scope = getExportScope("STUDENT", undefined, "student-123");
      expect(scope.canAccessFullInstitution).toBe(false);
      expect(scope.allowedStudentIds).toEqual(["student-123"]);
      expect(scope.isStudent).toBe(true);
    });
  });

  describe("checkExportAccess", () => {
    it("should allow admin student list export", () => {
      const check = checkExportAccess("ADMIN", "STUDENT_LIST");
      expect(check.allowed).toBe(true);
    });

    it("should deny non-admin attendance export", () => {
      const check = checkExportAccess("STAFF", "ATTENDANCE_REGISTER");
      expect(check.allowed).toBe(false);
      expect(check.reason).toBeDefined();
    });

    it("should deny teacher attendance export without classes", () => {
      const scope = getExportScope("TEACHER", []);
      const check = checkExportAccess("TEACHER", "ATTENDANCE_REGISTER", scope);
      expect(check.allowed).toBe(false);
    });
  });

  describe("buildStudentExportWhere", () => {
    it("should return empty where for admin scope", () => {
      const scope = getExportScope("ADMIN");
      const where = buildStudentExportWhere(scope);
      expect(Object.keys(where).length).toBe(0);
    });

    it("should filter by class for teacher", () => {
      const classIds = ["class-1", "class-2"];
      const scope = getExportScope("TEACHER", classIds);
      const where = buildStudentExportWhere(scope);
      expect(where).toHaveProperty("classId");
    });

    it("should return invalid where for denied access", () => {
      const scope = getExportScope("STAFF");
      const where = buildStudentExportWhere(scope);
      expect(where).toHaveProperty("id", "__INVALID__");
    });
  });
});
