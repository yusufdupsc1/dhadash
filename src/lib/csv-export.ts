/**
 * CSV Export Utility
 * Converts data to CSV format and triggers browser download
 */

/**
 * Escape CSV field values (handle commas, quotes, newlines)
 */
function escapeCSVField(field: unknown): string {
  if (field === null || field === undefined) return "";
  const str = String(field).trim();
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert array of objects to CSV string
 */
export function convertToCSV<T extends Record<string, unknown>>(
  data: T[],
  headers: (keyof T)[] | string[],
  headerLabels?: string[]
): string {
  if (data.length === 0) return "";

  // Header row
  const headerRow = (headerLabels && headerLabels.length > 0
    ? headerLabels
    : headers
  ).map((h) => escapeCSVField(h)).join(",");

  // Data rows
  const rows = data.map((row) =>
    headers
      .map((header) => escapeCSVField(row[header as keyof T]))
      .join(",")
  );

  return [headerRow, ...rows].join("\n");
}

/**
 * Download CSV file to browser
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export data to CSV with one function call
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  headers: (keyof T)[] | string[],
  headerLabels?: string[]
): void {
  const csv = convertToCSV(data, headers, headerLabels);
  downloadCSV(csv, filename);
}
