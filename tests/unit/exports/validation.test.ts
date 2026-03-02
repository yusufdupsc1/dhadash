/**
 * Export Validation Tests
 * Tests Zod schema validation for all export parameters
 */

import { validateExportRequest } from "@/lib/exports/validation";
import { describe, expect, it } from "vitest";

describe("Export Validation", () => {
  describe("Student List Export", () => {
    it("should validate valid student list export request", () => {
      const request = {
        exportType: "STUDENT_LIST",
        pageSize: 1000,
      };
      const result = validateExportRequest(request);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.exportType).toBe("STUDENT_LIST");
        expect(result.data.pageSize).toBe(1000);
      }
    });

    it("should reject invalid export type", () => {
      const request = { exportType: "INVALID_TYPE" };
      const result = validateExportRequest(request);
      expect(result.valid).toBe(false);
    });

    it("should enforce pageSize limits", () => {
      const request = {
        exportType: "STUDENT_LIST",
        pageSize: 50000, // Too large
      };
      const result = validateExportRequest(request);
      expect(result.valid).toBe(false);
    });

    it("should accept class filter", () => {
      const request = {
        exportType: "STUDENT_LIST",
        classId: "class-123",
      };
      const result = validateExportRequest(request);
      expect(result.valid).toBe(true);
    });

    it("should accept valid statuses", () => {
      const statuses = ["ACTIVE", "INACTIVE", "GRADUATED", "SUSPENDED", "EXPELLED", "TRANSFERRED"];
      for (const status of statuses) {
        const request = {
          exportType: "STUDENT_LIST",
          status,
        };
        const result = validateExportRequest(request);
        expect(result.valid).toBe(true);
      }
    });
  });

  describe("Attendance Register Export", () => {
    it("should validate valid attendance export request", () => {
      const request = {
        exportType: "ATTENDANCE_REGISTER",
        classId: "class-123",
        date: "2026-03-02",
      };
      const result = validateExportRequest(request);
      expect(result.valid).toBe(true);
    });

    it("should require classId", () => {
      const request = {
        exportType: "ATTENDANCE_REGISTER",
        date: "2026-03-02",
      };
      const result = validateExportRequest(request);
      expect(result.valid).toBe(false);
    });

    it("should require valid date format", () => {
      const request = {
        exportType: "ATTENDANCE_REGISTER",
        classId: "class-123",
        date: "invalid-date",
      };
      const result = validateExportRequest(request);
      expect(result.valid).toBe(false);
    });

    it("should enforce date range constraints", () => {
      const request = {
        exportType: "ATTENDANCE_REGISTER",
        classId: "class-123",
        date: "2000-01-01", // Too old
      };
      const result = validateExportRequest(request);
      expect(result.valid).toBe(false);
    });
  });

  describe("GDPR Minimal Mode", () => {
    it("should accept GDPR minimal mode flag", () => {
      const request = {
        exportType: "STUDENT_LIST",
        gdprMinimalMode: true,
      };
      const result = validateExportRequest(request);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.gdprMinimalMode).toBe(true);
      }
    });

    it("should default to false if not specified", () => {
      const request = {
        exportType: "STUDENT_LIST",
      };
      const result = validateExportRequest(request);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.gdprMinimalMode).toBe(false);
      }
    });
  });
});
