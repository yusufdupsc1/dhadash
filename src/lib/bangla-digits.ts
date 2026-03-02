/**
 * Bangla Digit Conversion Utilities
 * Converts English digits (0-9) to Bangla digits (০-৯)
 */

const ENGLISH_DIGITS = "0123456789";
const BANGLA_DIGITS = "০১২৩৪৫৬৭৮৯";

/**
 * Converts English digits in a string to Bangla digits
 * @param text - Input string potentially containing English digits
 * @returns String with all English digits replaced by Bangla equivalents
 */
export function convertToBanglaDigits(text: string | number | null | undefined): string {
  if (text === null || text === undefined) return "";

  const str = String(text);
  let result = "";

  for (const char of str) {
    const index = ENGLISH_DIGITS.indexOf(char);
    if (index !== -1) {
      result += BANGLA_DIGITS[index];
    } else {
      result += char;
    }
  }

  return result;
}

/**
 * Formats a number with optional Bangla digit conversion
 * @param value - Number to format
 * @param useBangla - Whether to convert to Bangla digits
 * @returns Formatted string
 */
export function formatNumber(value: number | null | undefined, useBangla: boolean): string {
  if (value === null || value === undefined) return "-";

  const formatted = value.toString();
  return useBangla ? convertToBanglaDigits(formatted) : formatted;
}

/**
 * Formats a date string with optional Bangla digit conversion
 * @param dateStr - Date string in format YYYY-MM-DD
 * @param useBangla - Whether to convert to Bangla digits
 * @returns Formatted date string
 */
export function formatDateWithBangla(dateStr: string, useBangla: boolean): string {
  if (!useBangla) return dateStr;
  return convertToBanglaDigits(dateStr);
}
