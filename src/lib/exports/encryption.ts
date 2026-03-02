/**
 * Export Download Token Encryption & Management
 * Handles secure generation, encryption, and validation of download tokens
 */

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logApiError } from "@/lib/logger";
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { ExportType } from "./validation";

const ALGORITHM = "aes-256-gcm";
const TOKEN_TTL_MINUTES = 5;

/**
 * Token payload structure
 */
interface TokenPayload {
  institutionId: string;
  userId: string;
  fileId: string;
  exportType: ExportType;
  iat: number; // issued at
  exp: number; // expiration
}

/**
 * Generate a cryptographically secure random token
 */
function generateRandomToken(bytes: number = 32): string {
  return randomBytes(bytes).toString("hex");
}

/**
 * Encrypt token payload
 * Returns: { encrypted, iv, authTag }
 */
function encryptPayload(
  payload: TokenPayload,
  secret: string,
): {
  encrypted: string;
  iv: string;
  authTag: string;
} {
  const iv = randomBytes(16).toString("hex");
  const cipher = createCipheriv(ALGORITHM, Buffer.from(secret, "hex").subarray(0, 32), Buffer.from(iv, "hex"));

  const plaintext = JSON.stringify(payload);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return { encrypted, iv, authTag };
}

/**
 * Decrypt token payload
 */
function decryptPayload(
  encrypted: string,
  iv: string,
  authTag: string,
  secret: string,
): TokenPayload | null {
  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      Buffer.from(secret, "hex").subarray(0, 32),
      Buffer.from(iv, "hex"),
    );
    decipher.setAuthTag(Buffer.from(authTag, "hex"));

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return JSON.parse(decrypted) as TokenPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Generate HMAC signature for token verification
 */
function generateSignature(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("hex");
}

/**
 * Safely compare two signatures (timing-safe)
 */
function verifySignature(provided: string, expected: string): boolean {
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * Create a download token
 * Returns the token to be sent to client for download
 */
export async function createDownloadToken(payload: Omit<TokenPayload, "iat" | "exp">): Promise<{
  token: string;
  expiresIn: number;
} | null> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + TOKEN_TTL_MINUTES * 60;

    const fullPayload: TokenPayload = {
      ...payload,
      iat: now,
      exp,
    };

    const encryptSecret = env.AUTH_SECRET || "default-secret";
    const { encrypted, iv, authTag } = encryptPayload(fullPayload, encryptSecret);

    // Create signature for integrity verification
    const signatureData = `${encrypted}:${iv}:${authTag}`;
    const signature = generateSignature(signatureData, encryptSecret);

    // Store token metadata in database
    const fileId = generateRandomToken(16);

    await db.exportDownloadToken.create({
      data: {
        institutionId: payload.institutionId,
        userId: payload.userId,
        fileId,
        exportType: payload.exportType,
        encryptedPath: encrypted,
        encryptedToken: `${iv}:${authTag}:${signature}`,
        expiresAt: new Date(exp * 1000),
      },
    });

    // Return compact token (fileId:signature) for client
    const clientToken = `${fileId}.${signature}`;

    return {
      token: clientToken,
      expiresIn: TOKEN_TTL_MINUTES * 60,
    };
  } catch (error) {
    logApiError("CREATE_DOWNLOAD_TOKEN_FAILED", error, payload);
    return null;
  }
}

/**
 * Verify and extract payload from token
 */
export async function verifyDownloadToken(clientToken: string): Promise<TokenPayload | null> {
  try {
    // Parse token format: fileId.signature
    const [fileId, providedSignature] = clientToken.split(".");

    if (!fileId || !providedSignature) {
      return null;
    }

    // Get token from database
    const tokenRecord = await db.exportDownloadToken.findUnique({
      where: { fileId },
      select: {
        encryptedPath: true,
        encryptedToken: true,
        expiresAt: true,
        usedAt: true,
        fileId: true,
      },
    });

    if (!tokenRecord) {
      return null;
    }

    // Check expiration
    if (tokenRecord.expiresAt < new Date()) {
      return null;
    }

    // Check if already used (single-use tokens)
    if (tokenRecord.usedAt) {
      return null;
    }

    // Verify signature
    const [iv, authTag, storedSignature] = tokenRecord.encryptedToken.split(":");
    if (!verifySignature(providedSignature, storedSignature)) {
      return null;
    }

    // Decrypt payload
    const encryptSecret = env.AUTH_SECRET || "default-secret";
    const payload = decryptPayload(
      tokenRecord.encryptedPath,
      iv,
      authTag,
      encryptSecret,
    );

    if (!payload) {
      return null;
    }

    // Check expiration in payload
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null;
    }

    // Mark token as used
    await db.exportDownloadToken.update({
      where: { fileId },
      data: { usedAt: new Date() },
    });

    return payload;
  } catch (error) {
    logApiError("VERIFY_DOWNLOAD_TOKEN_FAILED", error, { token: clientToken.substring(0, 10) });
    return null;
  }
}

/**
 * Clean up expired tokens
 * Should be called periodically via cron job
 */
export async function cleanupExpiredTokens(): Promise<number> {
  try {
    const result = await db.exportDownloadToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    return result.count;
  } catch (error) {
    logApiError("CLEANUP_EXPIRED_TOKENS_FAILED", error);
    return 0;
  }
}

/**
 * Revoke a token (mark as used)
 */
export async function revokeToken(fileId: string): Promise<boolean> {
  try {
    const result = await db.exportDownloadToken.updateMany({
      where: { fileId },
      data: { usedAt: new Date() },
    });

    return result.count > 0;
  } catch (error) {
    logApiError("REVOKE_TOKEN_FAILED", error, { fileId });
    return false;
  }
}
