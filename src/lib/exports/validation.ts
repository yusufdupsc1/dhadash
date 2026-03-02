/**
 * Export Request Validation - Zod Schemas
 * Validates all export parameters with strict constraints
 */

import { z } from "zod";

/**
 * Export Type Enum
 */
export const ExportTypeSchema = z.enum(["STUDENT_LIST", "ATTENDANCE_REGISTER"]);
export type ExportType = z.infer<typeof ExportTypeSchema>;

/**
 * Student List Export Request
 * - Optional filtering by class, status, or search term
 * - Max pageSize of 10K records per batch
 */
export const StudentListExportSchema = z.object({
  exportType: z.literal("STUDENT_LIST"),
  classId: z.string().optional().or(z.literal("")),
  status: z
    .enum(["ACTIVE", "INACTIVE", "GRADUATED", "SUSPENDED", "EXPELLED", "TRANSFERRED"])
    .optional(),
  search: z.string().max(100).optional().or(z.literal("")),
  pageSize: z.number().int().min(100).max(10000).default(5000),
  gdprMinimalMode: z.boolean().default(false),
});

export type StudentListExportRequest = z.infer<typeof StudentListExportSchema>;

/**
 * Attendance Register Export Request
 * - Requires classId and date
 * - Date must be within +/- 3 years from today
 */
export const AttendanceExportSchema = z.object({
  exportType: z.literal("ATTENDANCE_REGISTER"),
  classId: z.string().min(1, "Class ID is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  gdprMinimalMode: z.boolean().default(false),
});

export type AttendanceExportRequest = z.infer<typeof AttendanceExportSchema>;

/**
 * Union of all export request types
 */
export const ExportRequestSchema = z.discriminatedUnion("exportType", [
  StudentListExportSchema,
  AttendanceExportSchema,
]);

export type ExportRequest = z.infer<typeof ExportRequestSchema>;

/**
 * Validate export request
 */
export function validateExportRequest(
  data: unknown,
): { valid: true; data: ExportRequest } | { valid: false; errors: Record<string, string[]> } {
  const parsed = ExportRequestSchema.safeParse(data);

  if (parsed.success) {
    // Additional runtime validations
    if (parsed.data.exportType === "ATTENDANCE_REGISTER") {
      const date = new Date(parsed.data.date);
      const today = new Date();
      const threeYearsAgo = new Date(today.getFullYear() - 3, today.getMonth(), today.getDate());
      const threeYearsFromNow = new Date(
        today.getFullYear() + 3,
        today.getMonth(),
        today.getDate(),
      );

      if (date < threeYearsAgo || date > threeYearsFromNow) {
        return {
          valid: false,
          errors: {
            date: ["Date must be within 3 years of today"],
          },
        };
      }
    }

    return { valid: true, data: parsed.data };
  }

  return {
    valid: false,
    errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
  };
}

/**
 * Export response types
 */
export interface ExportRequestResult {
  success: boolean;
  data?: {
    downloadToken: string;
    fileId: string;
    estimatedSize: number;
    estimatedRecords: number;
    expiresIn: number; // seconds
    message: string;
  };
  error?: string;
  validationErrors?: Record<string, string[]>;
}

/**
 * Download token validation schema
 */
export const DownloadTokenSchema = z.object({
  tokenId: z.string().min(1),
  institutionId: z.string().min(1),
  userId: z.string().min(1),
  exportType: ExportTypeSchema,
});

export type DownloadToken = z.infer<typeof DownloadTokenSchema>;
