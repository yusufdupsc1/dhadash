# CSV Export Feature - Production Deployment Guide

## Quick Start - Local Testing

### Prerequisites
- Node.js 22+
- Docker & Docker Compose
- pnpm 10.30.3+

### 1. Start Development Environment

```bash
# Clone repository
git clone https://github.com/yourusername/dhadash.git
cd dhadash

# Start services (PostgreSQL, Redis, App)
docker-compose up -d

# Wait for services to be healthy
docker-compose ps

# Run migrations
pnpm exec prisma migrate deploy

# Seed database (optional)
pnpm exec prisma db seed
```

### 2. Verify Installation

```bash
# Open browser
# http://localhost:3000

# Test API health
curl http://localhost:3000/api/health

# Check logs
docker-compose logs app -f
```

### 3. Run Tests Locally

```bash
# Unit tests
pnpm test

# Integration tests
pnpm test:integration

# E2E tests (requires app running)
pnpm test:e2e

# Coverage report
pnpm test:coverage
```

### 4. Test CSV Export Feature

```bash
# 1. Login as admin at http://localhost:3000/auth/login
#    Demo credentials in environment

# 2. Navigate to Students dashboard
#    http://localhost:3000/dashboard/students

# 3. Click "Export CSV" button

# 4. Select options and export

# 5. Verify file downloaded and contains correct data

# 6. Test with different roles (teacher, staff) to verify RBAC
```

## Production Deployment

### Prerequisites for Production
- Vercel account or server running Node.js 22+
- PostgreSQL database (managed or self-hosted)
- Redis for rate limiting and caching
- Environment variables configured

### Environment Variables

Create `.env.production`:

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dhadash
DIRECT_URL=postgresql://user:pass@host:5432/dhadash  # For migrations

# Authentication
AUTH_SECRET=your-32-character-secret-key-here-minimum

# API Configuration
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Redis (optional, for production rate limiting)
REDIS_URL=redis://host:6379

# Email Notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=app-specific-password

# Optional: Sentry for error tracking
SENTRY_DSN=https://your-sentry-url

# Optional: Stripe for payments
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_KEY=pk_live_...
```

### Deploy to Vercel

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Link project
vercel link

# 3. Set environment variables
vercel env add DATABASE_URL
vercel env add AUTH_SECRET
vercel env add NEXT_PUBLIC_APP_URL
vercel env add REDIS_URL

# 4. Deploy
vercel --prod

# 5. Run migrations on production
vercel env pull
pnpm exec prisma migrate deploy --name "add export tables"
```

### Deploy to Docker

```bash
# 1. Build image
docker build -t dhadash:latest .

# 2. Run container
docker run -d \
  --name dhadash \
  -p 3000:3000 \
  -e DATABASE_URL=$DATABASE_URL \
  -e AUTH_SECRET=$AUTH_SECRET \
  -e REDIS_URL=$REDIS_URL \
  -e NEXT_PUBLIC_APP_URL=https://yourdomain.com \
  dhadash:latest

# 3. Run migrations
docker exec dhadash pnpm exec prisma migrate deploy

# 4. Check logs
docker logs -f dhadash
```

## Post-Deployment Verification

### 1. Health Check
```bash
curl https://yourdomain .com/api/health

# Expected response:
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-03-02T10:00:00Z"
}
```

### 2. Export Feature Test
- Login as admin
- Navigate to Students page
- Click "Export CSV"
- Verify file downloads
- Check audit logs: `SELECT * FROM export_audit_logs ORDER BY createdAt DESC LIMIT 10;`

### 3. Security Verification
```bash
# Check rate limiting works
for i in {1..15}; do curl -X POST https://yourdomain.com/api/exports/request; done
# Should get 429 (Too Many Requests) after 10 requests

# Check RBAC
# Login as TEACHER
# Try to export (should succeed)
# Try to export attendance (should succeed)

# Login as STAFF
# Try to export (should fail with 403)
```

### 4. Database Audit Trail
```bash
# Check export logs
psql -U postgres -d dhadash -c "
  SELECT
    user_id,
    export_type,
    record_count,
    file_size,
    status,
    error_reason,
    created_at
  FROM export_audit_logs
  ORDER BY created_at DESC
  LIMIT 20;
"

# Check download tokens
psql -U postgres -d dhadash -c "
  SELECT
    id,
    user_id,
    export_type,
    expires_at,
    used_at
  FROM export_download_tokens
  ORDER BY created_at DESC
  LIMIT 10;
"
```

## Monitoring & Alerts

### Key Metrics to Monitor
1. **Export Performance**
   - Average export time
   - Max records exported
   - File size distribution

2. **Security**
   - Failed exports
   - Rate limit violations
   - Unauthorized access attempts

3. **Infrastructure**
   - Database connection pool
   - Redis memory usage
   - API response times

### Example Monitoring Queries

```sql
-- Export statistics (last 24 hours)
SELECT
  export_type,
  COUNT(*) as total_exports,
  SUM(record_count) as total_records,
  SUM(file_size) as total_bytes,
  AVG(file_size) as avg_file_size,
  (SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END)::float / COUNT(*)) as failure_rate
FROM export_audit_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY export_type;
```

## Troubleshooting

### Export Fails with "Rate Limit Exceeded"
- Check rate limit reset time in error message
- For immediate reset (admin only): `DELETE FROM export_audit_logs WHERE user_id = '...' AND created_at > NOW() - INTERVAL '1 minute';`

### Token Expiration Errors
- Download tokens expire after 5 minutes
- User must re-export to get new token
- Check token expiration: `SELECT * FROM export_download_tokens WHERE expires_at < NOW();`

### Memory Issues with Large Exports
- Check system memory: `free -h`
- Streaming should handle up to 50K records
- If issues persist, reduce page size in export request

### Database Connection Errors
- Verify DATABASE_URL is correct
- Check database is running: `psql -c "SELECT 1"`
- Check connection limit: `SELECT * FROM pg_stat_activity;`

## Maintenance

### Scheduled Cleanup Jobs

Add to crontab:

```bash
# Clean up expired tokens daily at 2 AM
0 2 * * * /usr/local/bin/node -e "require('./cleanup').cleanupExpiredTokens()"

# Archive old logs every Sunday
0 3 * * 0 /usr/local/bin/node -e "require('./cleanup').archiveOldLogs()"

# Prune database indexes
0 4 * * 0 /usr/local/bin/node -e "require('./cleanup').pruneIndexes()"
```

## Performance Optimization

### Database Indexes
Ensure these indexes exist:

```sql
CREATE INDEX CONCURRENTLY idx_export_logs_institution_created
  ON export_audit_logs(institution_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_export_logs_user_created
  ON export_audit_logs(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_download_tokens_expires
  ON export_download_tokens(expires_at DESC);

CREATE INDEX CONCURRENTLY idx_students_institution_status
  ON students(institution_id, status);
```

### Cache Invalidation
- Call `revalidatePath('/dashboard/students')` after student update
- Call `revalidatePath('/dashboard/attendance')` after attendance change

## Support & Escalation

For issues with CSV exports:

1. Check application logs
2. Review database audit trail
3. Verify rate limits and permissions
4. Check system resources
5. Contact support with:
   - User ID
   - Export type
   - Timestamp
   - Error message
   - System resources at time of failure
