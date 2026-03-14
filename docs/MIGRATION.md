# Migration Guide: Security Improvements

This guide helps you migrate to the improved security architecture.

## Breaking Changes

### 1. DOWNLOAD_TOKEN_SECRET Required

**What Changed**: `DOWNLOAD_TOKEN_SECRET` is now required and must be at least 32 characters.

**Before** (weak fallback):
```bash
# .env.local
# DOWNLOAD_TOKEN_SECRET was optional
```

**After** (required):
```bash
# .env.local
DOWNLOAD_TOKEN_SECRET=your-32-character-secret-here-abc123def456
```

**How to Migrate**:

```bash
# Generate a secure 32+ character secret
openssl rand -hex 32

# Add to .env.local
echo "DOWNLOAD_TOKEN_SECRET=$(openssl rand -hex 32)" >> .env.local
```

**Impact**: App will throw error on startup if not set

---

## Non-Breaking Improvements

These improvements are backward compatible but recommended:

### 2. Structured Logging

**What Changed**: New `logger` utility with PII redaction

**Migration** (optional but recommended):

```typescript
// Before
console.log("User login:", email, userId);
console.error("Payment failed:", error);

// After
import { logger } from "@/lib/logger";

logger.info("User login", { email, userId });
logger.error("Payment failed", { error: error.message, userId });
```

**Benefits**:
- Automatic PII redaction
- Structured JSON format
- Better searchability in logs

---

### 3. Idempotency Support

**What Changed**: New `withIdempotency` wrapper for API routes

**Migration** (optional):

```typescript
// Before
export async function POST(req: NextRequest) {
  const data = await req.json();
  const result = await createCharge(data);
  return NextResponse.json(result);
}

// After
import { withIdempotency } from "@/lib/idempotency";

export async function POST(req: NextRequest) {
  return withIdempotency(req, async () => {
    const data = await req.json();
    const result = await createCharge(data);
    return NextResponse.json(result);
  });
}
```

**Client-side** (add header):
```typescript
fetch("/api/checkout", {
  method: "POST",
  headers: {
    "Idempotency-Key": crypto.randomUUID(), // Browser API
  },
  body: JSON.stringify(data),
});
```

**Benefits**:
- Prevents duplicate charges
- Safe retries
- 24-hour caching

---

### 4. Environment Validation

**What Changed**: New startup validation

**Migration** (optional):

```typescript
// Add to your root layout or API route
import { validateEnvironmentOrThrow } from "@/lib/env-validation";

// Validate on startup (development only)
if (process.env.NODE_ENV !== "production") {
  validateEnvironmentOrThrow();
}
```

**Benefits**:
- Early detection of missing env vars
- Clear error messages
- Prevents runtime failures

---

### 5. Use Constants

**What Changed**: Centralized configuration values

**Migration** (recommended):

```typescript
// Before
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const TIMEOUT = 10000;

// After
import { SECURITY, API_TIMEOUTS } from "@/lib/constants";

const maxSize = SECURITY.MAX_FILE_SIZE;
const timeout = API_TIMEOUTS.DEFAULT_MS;
```

**Benefits**:
- Single source of truth
- Easier to update
- Type-safe

---

## Deployment Checklist

Before deploying to production:

### 1. Update Environment Variables

```bash
# Vercel
vercel env add DOWNLOAD_TOKEN_SECRET production

# Or via Vercel Dashboard
# 1. Go to Settings > Environment Variables
# 2. Add DOWNLOAD_TOKEN_SECRET with 32+ char value
# 3. Apply to Production environment
```

### 2. Run Tests

```bash
npm test
npm run test:e2e
```

Expected output:
```
✓ 9 test files (42 tests)
All tests passed
```

### 3. Check Build

```bash
npm run build
```

Should complete without errors.

### 4. Verify Secrets

```bash
# Check secret length
node -e "console.log(process.env.DOWNLOAD_TOKEN_SECRET?.length || 0)"
```

Should output 32 or higher.

---

## Rollback Plan

If you need to rollback:

### Option 1: Revert Commits

```bash
git revert HEAD~3..HEAD
git push origin main
```

### Option 2: Quick Fix

If just the DOWNLOAD_TOKEN_SECRET is causing issues:

```bash
# Temporarily use a weak secret (NOT for production)
export DOWNLOAD_TOKEN_SECRET="temporary-weak-secret-12345678901234567890"
```

Then fix properly ASAP.

---

## Testing Guide

### Local Testing

```bash
# 1. Update .env.local
echo "DOWNLOAD_TOKEN_SECRET=$(openssl rand -hex 32)" >> .env.local

# 2. Run tests
npm test

# 3. Start dev server
npm run dev

# 4. Test endpoints
curl http://localhost:3000/api/checkout -H "Idempotency-Key: test-123"
```

### Staging Testing

```bash
# 1. Deploy to staging
vercel --target staging

# 2. Check logs for warnings
vercel logs --follow

# 3. Test critical paths
- Upload file
- Create checkout
- Check payment status
```

### Production Deployment

```bash
# 1. Final verification
npm test && npm run build

# 2. Deploy
vercel --prod

# 3. Monitor
vercel logs --prod --follow

# 4. Verify no errors
vercel inspect --prod
```

---

## Common Issues

### Issue: "DOWNLOAD_TOKEN_SECRET is not set"

**Solution**: Add to environment:
```bash
echo "DOWNLOAD_TOKEN_SECRET=$(openssl rand -hex 32)" >> .env.local
```

### Issue: "Secret must be at least 32 characters"

**Solution**: Generate longer secret:
```bash
openssl rand -hex 32  # Generates 64-char hex string
```

### Issue: Tests failing after update

**Solution**: Clear test cache:
```bash
rm -rf node_modules/.vite
npm test
```

### Issue: Build errors with new imports

**Solution**: Rebuild from scratch:
```bash
rm -rf .next node_modules
npm install
npm run build
```

---

## Support

- **Documentation**: See `docs/SECURITY.md` and `docs/BEST_PRACTICES.md`
- **Issues**: Open GitHub issue with `[Security]` prefix
- **Urgent**: Contact security team directly

---

**Last Updated**: 2026-03-14  
**Version**: 1.0
