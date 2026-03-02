/**
 * Export Rate Limiting
 * Prevents abuse: max 10 exports per minute per user, 50 per hour per institution
 */

import { logApiError } from "@/lib/logger";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // seconds
}

/**
 * Rate limit keys
 */
function getUserMinuteKey(userId: string): string {
  return `export:user:minute:${userId}`;
}

function getInstitutionHourKey(institutionId: string): string {
  return `export:institution:hour:${institutionId}`;
}

/**
 * In-memory rate limit store (development)
 * For production, migrate to Redis
 */
const rateLimitStore = new Map<
  string,
  {
    count: number;
    resetAt: Date;
  }
>();

/**
 * Check if an export is allowed for a user (per minute limit)
 * Limit: 10 exports per minute per user
 */
async function checkUserMinuteLimit(userId: string): Promise<RateLimitResult> {
  const key = getUserMinuteKey(userId);
  const now = new Date();
  const resetAt = new Date(now.getTime() + 60 * 1000); // 1 minute from now

  let entry = rateLimitStore.get(key);

  // Initialize or reset if expired
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt };
    rateLimitStore.set(key, entry);
  }

  // Check limit (10 per minute)
  if (entry.count >= 10) {
    const retryAfter = Math.ceil((entry.resetAt.getTime() - now.getTime()) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter,
    };
  }

  entry.count += 1;

  return {
    allowed: true,
    remaining: 10 - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Check if an export is allowed for an institution (per hour limit)
 * Limit: 50 exports per hour per institution
 */
async function checkInstitutionHourLimit(
  institutionId: string,
): Promise<RateLimitResult> {
  const key = getInstitutionHourKey(institutionId);
  const now = new Date();
  const resetAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

  let entry = rateLimitStore.get(key);

  // Initialize or reset if expired
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt };
    rateLimitStore.set(key, entry);
  }

  // Check limit (50 per hour)
  if (entry.count >= 50) {
    const retryAfter = Math.ceil((entry.resetAt.getTime() - now.getTime()) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter,
    };
  }

  entry.count += 1;

  return {
    allowed: true,
    remaining: 50 - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Combined rate limit check for exports
 * Returns detailed result with the most restrictive limit
 */
export async function checkExportRateLimit(
  userId: string,
  institutionId: string,
): Promise<{
  allowed: boolean;
  userRemaining: number;
  institutionRemaining: number;
  resetAt: Date;
  retryAfter?: number;
  limitExceeded?: "user" | "institution";
}> {
  try {
    const [userLimit, institutionLimit] = await Promise.all([
      checkUserMinuteLimit(userId),
      checkInstitutionHourLimit(institutionId),
    ]);

    // If either limit exceeded, deny
    if (!userLimit.allowed) {
      return {
        allowed: false,
        userRemaining: userLimit.remaining,
        institutionRemaining: institutionLimit.remaining,
        resetAt: userLimit.resetAt,
        retryAfter: userLimit.retryAfter,
        limitExceeded: "user",
      };
    }

    if (!institutionLimit.allowed) {
      return {
        allowed: false,
        userRemaining: userLimit.remaining,
        institutionRemaining: institutionLimit.remaining,
        resetAt: institutionLimit.resetAt,
        retryAfter: institutionLimit.retryAfter,
        limitExceeded: "institution",
      };
    }

    return {
      allowed: true,
      userRemaining: userLimit.remaining,
      institutionRemaining: institutionLimit.remaining,
      resetAt: new Date(
        Math.min(userLimit.resetAt.getTime(), institutionLimit.resetAt.getTime()),
      ),
    };
  } catch (error) {
    logApiError("CHECK_EXPORT_RATE_LIMIT_FAILED", error, { userId, institutionId });
    // Fail open - allow export on error, but log it
    return {
      allowed: true,
      userRemaining: 10,
      institutionRemaining: 50,
      resetAt: new Date(),
    };
  }
}

/**
 * Reset rate limit for administrative override
 */
export async function resetExportRateLimit(userId: string, institutionId: string): Promise<void> {
  rateLimitStore.delete(getUserMinuteKey(userId));
  rateLimitStore.delete(getInstitutionHourKey(institutionId));
}

/**
 * Clean up expired entries (called periodically)
 */
export function cleanupRateLimitStore(): void {
  const now = new Date();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Calculate human-readable message for rate limit
 */
export function getRateLimitMessage(result: {
  limitExceeded?: "user" | "institution";
  retryAfter?: number;
  userRemaining?: number;
  institutionRemaining?: number;
}): string {
  if (result.limitExceeded === "user") {
    const minutes = Math.ceil((result.retryAfter || 60) / 60);
    return `You've reached the export limit. Try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`;
  }

  if (result.limitExceeded === "institution") {
    const hours = Math.ceil((result.retryAfter || 3600) / 3600);
    return `Your institution has reached the hourly export limit. Try again in ${hours} hour${hours > 1 ? "s" : ""}.`;
  }

  return "Export limit exceeded. Please try again later.";
}
