-- Add username identity column to users
ALTER TABLE "users"
ADD COLUMN "username" TEXT;

-- Enforce case-insensitive uniqueness for non-null usernames
CREATE UNIQUE INDEX "users_username_ci_unique"
ON "users" (LOWER("username"))
WHERE "username" IS NOT NULL;

-- Supporting lookup index for mixed identity login paths
CREATE INDEX "users_username_idx"
ON "users"("username");

