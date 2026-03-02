/**
 * Export Audit Logger
 * Logs all export activities for compliance and security auditing
 */

import { db } from "@/lib/db";
import { logApiError } from "@/lib/logger";
import type { ExportType } from "./validation";

export interface ExportAuditEntry {
  institutionId: string;
  userId: string;
  exportType: ExportType;
  recordCount: number;
  fileSize: number;
  filters?: Record<string, any>;
  ipAddress: string;
  userAgent?: string;
  status: "SUCCESS" | "FAILED" | "PARTIAL";
  errorReason?: string;
}

/**
 * Log export activity to database
 * Called after export completes (success or failure)
 */
export async function logExportActivity(entry: ExportAuditEntry): Promise<void> {
  try {
    await db.exportAuditLog.create({
      data: {
        institutionId: entry.institutionId,
        userId: entry.userId,
        exportType: entry.exportType,
        recordCount: entry.recordCount,
        fileSize: entry.fileSize,
        filters: entry.filters || null,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent || null,
        status: entry.status,
        errorReason: entry.errorReason || null,
      },
    });
  } catch (error) {
    logApiError("EXPORT_AUDIT_LOG_FAILED", error, {
      institutionId: entry.institutionId,
      userId: entry.userId,
      exportType: entry.exportType,
    });
    // Don't throw - audit logging failure shouldn't block exports
    console.error("[EXPORT_AUDIT_LOG] Failed to log export activity", error);
  }
}

/**
 * Get audit logs for a user
 * Used for export history and compliance checks
 */
export async function getUserExportHistory(userId: string, limit: number = 20) {
  try {
    const logs = await db.exportAuditLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        exportType: true,
        recordCount: true,
        fileSize: true,
        status: true,
        createdAt: true,
      },
    });

    return logs;
  } catch (error) {
    logApiError("GET_EXPORT_HISTORY_FAILED", error, { userId });
    return [];
  }
}

/**
 * Get audit logs for an institution
 * Used by admins to view all exports
 */
export async function getInstitutionExportHistory(
  institutionId: string,
  limit: number = 100,
  offset: number = 0,
) {
  try {
    const [logs, total] = await Promise.all([
      db.exportAuditLog.findMany({
        where: { institutionId },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          userId: true,
          exportType: true,
          recordCount: true,
          fileSize: true,
          status: true,
          errorReason: true,
          createdAt: true,
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
      db.exportAuditLog.count({ where: { institutionId } }),
    ]);

    return { logs, total, limit, offset };
  } catch (error) {
    logApiError("GET_INSTITUTION_EXPORT_HISTORY_FAILED", error, { institutionId });
    return { logs: [], total: 0, limit, offset };
  }
}

/**
 * Get export statistics for compliance reporting
 */
export async function getExportStats(
  institutionId: string,
  days: number = 30,
): Promise<{
  totalExports: number;
  successfulExports: number;
  failedExports: number;
  totalRecordsExported: number;
  totalDataExported: number; // in bytes
  byType: Record<ExportType, { count: number; records: number; bytes: number }>;
}> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const logs = await db.exportAuditLog.findMany({
      where: {
        institutionId,
        createdAt: { gte: cutoffDate },
      },
    });

    const stats = {
      totalExports: logs.length,
      successfulExports: logs.filter((l) => l.status === "SUCCESS").length,
      failedExports: logs.filter((l) => l.status === "FAILED").length,
      totalRecordsExported: logs.reduce((sum, l) => sum + l.recordCount, 0),
      totalDataExported: logs.reduce((sum, l) => sum + l.fileSize, 0),
      byType: {
        STUDENT_LIST: {
          count: logs.filter((l) => l.exportType === "STUDENT_LIST").length,
          records: logs
            .filter((l) => l.exportType === "STUDENT_LIST")
            .reduce((sum, l) => sum + l.recordCount, 0),
          bytes: logs
            .filter((l) => l.exportType === "STUDENT_LIST")
            .reduce((sum, l) => sum + l.fileSize, 0),
        },
        ATTENDANCE_REGISTER: {
          count: logs.filter((l) => l.exportType === "ATTENDANCE_REGISTER").length,
          records: logs
            .filter((l) => l.exportType === "ATTENDANCE_REGISTER")
            .reduce((sum, l) => sum + l.recordCount, 0),
          bytes: logs
            .filter((l) => l.exportType === "ATTENDANCE_REGISTER")
            .reduce((sum, l) => sum + l.fileSize, 0),
        },
      },
    };

    return stats;
  } catch (error) {
    logApiError("GET_EXPORT_STATS_FAILED", error, { institutionId, days });
    return {
      totalExports: 0,
      successfulExports: 0,
      failedExports: 0,
      totalRecordsExported: 0,
      totalDataExported: 0,
      byType: {
        STUDENT_LIST: { count: 0, records: 0, bytes: 0 },
        ATTENDANCE_REGISTER: { count: 0, records: 0, bytes: 0 },
      },
    };
  }
}

/**
 * Clean up old logs (retention policy)
 * Typically called by a cron job
 * @param retentionDays - Keep logs for this many days (default: 90)
 */
export async function cleanupOldExportLogs(retentionDays: number = 90): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await db.exportAuditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    return result.count;
  } catch (error) {
    logApiError("CLEANUP_EXPORT_LOGS_FAILED", error, { retentionDays });
    return 0;
  }
}
