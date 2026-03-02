/**
 * Download Streaming Endpoint
 * Serves encrypted CSV downloads with token validation and streaming
 */

import { db } from "@/lib/db";
import { verifyDownloadToken } from "@/lib/exports/encryption";
import { logApiError } from "@/lib/logger";
import { asPlainArray, toIsoDate } from "@/lib/server/serializers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  try {
    const { tokenId } = await params;

    if (!tokenId) {
      return NextResponse.json(
        { error: "Token ID required" },
        { status: 400 }
      );
    }

    // Verify token and get payload
    const payload = await verifyDownloadToken(tokenId);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired download token" },
        { status: 401 }
      );
    }

    // Generate CSV based on export type
    let csv: string;
    let filename: string;

    if (payload.exportType === "STUDENT_LIST") {
      const result = await generateStudentListCSV(payload.institutionId);
      csv = result.csv;
      filename = result.filename;
    } else {
      const result = await generateAttendanceCSV(payload.institutionId);
      csv = result.csv;
      filename = result.filename;
    }

    // Return CSV as file download
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    logApiError("DOWNLOAD_STREAMING_ENDPOINT", error, { tokenId: (await params).tokenId });
    return NextResponse.json(
      { error: "Download failed" },
      { status: 500 }
    );
  }
}

/**
 * Generate student list CSV
 */
async function generateStudentListCSV(
  institutionId: string
): Promise<{ csv: string; filename: string }> {
  const students = await db.student.findMany({
    where: { institutionId },
    select: {
      studentId: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      dateOfBirth: true,
      gender: true,
      status: true,
      createdAt: true,
      class: { select: { name: true, grade: true, section: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const exportData = asPlainArray(students).map((student) => ({
    studentId: student.studentId || "",
    firstName: student.firstName,
    lastName: student.lastName,
    email: student.email || "",
    phone: student.phone || "",
    dateOfBirth: student.dateOfBirth ? toIsoDate(student.dateOfBirth) : "",
    gender: student.gender || "",
    class: student.class
      ? `${student.class.grade} - ${student.class.name}`
      : "",
    status: student.status,
    joinedDate: toIsoDate(student.createdAt),
  }));

  const headers = [
    "studentId",
    "firstName",
    "lastName",
    "email",
    "phone",
    "dateOfBirth",
    "gender",
    "class",
    "status",
    "joinedDate",
  ] as const;
  const headerLabels = [
    "Student ID",
    "First Name",
    "Last Name",
    "Email",
    "Phone",
    "Date of Birth",
    "Gender",
    "Class",
    "Status",
    "Joined Date",
  ];

  const csv = generateCSV(exportData, headers, headerLabels);
  const filename = `students_${new Date().toISOString().slice(0, 10)}.csv`;

  return { csv, filename };
}

/**
 * Generate attendance CSV
 */
async function generateAttendanceCSV(
  institutionId: string
): Promise<{ csv: string; filename: string }> {
  const today = new Date().toISOString().slice(0, 10);
  const attendanceDate = new Date(today);
  attendanceDate.setHours(0, 0, 0, 0);

  const students = await db.student.findMany({
    where: { institutionId },
    select: {
      id: true,
      studentId: true,
      firstName: true,
      lastName: true,
      rollNo: true,
      attendance: {
        where: { date: attendanceDate },
        select: { status: true },
        take: 1,
      },
    },
    orderBy: [{ rollNo: { sort: "asc", nulls: "last" } }, { firstName: "asc" }],
  });

  const exportData = asPlainArray(students).map((student, index) => ({
    rolNo: student.rollNo || String(index + 1),
    studentId: student.studentId,
    firstName: student.firstName,
    lastName: student.lastName,
    status: student.attendance?.[0]?.status || "ABSENT",
  }));

  const headers = ["rolNo", "studentId", "firstName", "lastName", "status"] as const;
  const headerLabels = ["Roll No", "Student ID", "First Name", "Last Name", "Status"];

  const csv = generateCSV(exportData, headers, headerLabels);
  const filename = `attendance_${today}.csv`;

  return { csv, filename };
}

/**
 * Generate CSV from data
 */
function generateCSV<T extends Record<string, unknown>>(
  data: T[],
  headers: readonly (keyof T)[],
  headerLabels: string[]
): string {
  const headerRow = headerLabels.map(escapeCSV).join(",");
  const rows = data.map((row) =>
    headers.map((header) => escapeCSV(row[header])).join(",")
  );

  return [headerRow, ...rows].join("\n");
}

/**
 * Escape CSV field
 */
function escapeCSV(field: unknown): string {
  if (field === null || field === undefined) return "";
  const str = String(field).trim();
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
