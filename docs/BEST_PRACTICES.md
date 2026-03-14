# Development Best Practices

This document outlines best practices for contributing to the neo-convert codebase.

## Table of Contents

- [Code Style](#code-style)
- [Security Guidelines](#security-guidelines)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Performance](#performance)
- [Git Workflow](#git-workflow)

## Code Style

### TypeScript

- **Use constants**: Import from `lib/constants.ts` instead of hardcoding values
- **Type safety**: Avoid `any` types; use proper type annotations
- **Naming conventions**:
  - `camelCase` for variables and functions
  - `PascalCase` for components and types
  - `UPPER_SNAKE_CASE` for constants
  - Prefix private helpers with underscore: `_helperFunction`

### Example

```typescript
// ❌ Bad
const MAX = 50 * 1024 * 1024;
function checkEmail(e: any) {
  if (!e || e.length > 254) return false;
  return true;
}

// ✅ Good
import { SECURITY } from "@/lib/constants";
import { normalizeEmail } from "@/lib/security";

function validateUserEmail(email: unknown): boolean {
  return normalizeEmail(email) !== null;
}
```

## Security Guidelines

### Input Validation

**Always validate user inputs** using helpers from `lib/security.ts`:

```typescript
import { normalizeEmail, normalizeText, safeFilename } from "@/lib/security";

// Validate email
const email = normalizeEmail(req.body.email);
if (!email) {
  return NextResponse.json({ error: "Invalid email" }, { status: 400 });
}

// Validate text input
const name = normalizeText(req.body.name, SECURITY.MAX_TEXT_LENGTH);
if (!name) {
  return NextResponse.json({ error: "Invalid name" }, { status: 400 });
}

// Sanitize filenames
const safe = safeFilename(userInput);
```

### Logging

**Use structured logging** with automatic PII redaction:

```typescript
import { logger } from "@/lib/logger";

// ❌ Bad - exposes PII in logs
console.log("User login:", email, password);

// ✅ Good - PII is automatically redacted
logger.info("User login", { email, userId: user.id });
// Output: email will be masked like "u***r@domain.com"
```

### Secrets Management

- **Never commit secrets** to Git
- Use environment variables for all secrets
- Validate secrets on startup:

```typescript
import { validateEnvironmentOrThrow } from "@/lib/env-validation";

// At app startup
validateEnvironmentOrThrow();
```

### CSRF Protection

Always enforce same-origin for state-changing operations:

```typescript
import { isSameOriginRequest } from "@/lib/security";

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json(
      { error: "Cross-origin requests not allowed" },
      { status: 403 }
    );
  }
  // ... handle request
}
```

### Rate Limiting

Apply rate limiting to all public endpoints:

```typescript
import { enforceRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";
import { RATE_LIMITS } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limit = enforceRateLimit(
    `upload:${ip}`,
    RATE_LIMITS.UPLOAD.MAX_REQUESTS,
    RATE_LIMITS.UPLOAD.WINDOW_MS
  );

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      }
    );
  }
  // ... handle request
}
```

## Error Handling

### API Routes

Use consistent error responses:

```typescript
// ✅ Good error handling
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    // Validate input
    const email = normalizeEmail(data.email);
    if (!email) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Process request
    const result = await processEmail(email);
    return NextResponse.json(result);

  } catch (error) {
    logger.error("Email processing failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      path: req.nextUrl.pathname,
    });

    // Don't expose internal errors to client
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### External API Calls

Always use timeouts with AbortController:

```typescript
import { API_TIMEOUTS } from "@/lib/constants";

async function callExternalAPI(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    API_TIMEOUTS.DEFAULT_MS
  );

  try {
    const response = await fetch(url, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    return await response.json();

  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timeout");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
```

## Testing

### Unit Tests

Test all security-critical functions:

```typescript
import { describe, expect, it } from "vitest";
import { normalizeEmail } from "@/lib/security";

describe("normalizeEmail", () => {
  it("accepts valid emails", () => {
    expect(normalizeEmail("test@example.com")).toBe("test@example.com");
  });

  it("rejects emails over max length", () => {
    const long = "a".repeat(255) + "@example.com";
    expect(normalizeEmail(long)).toBeNull();
  });

  it("handles non-string inputs", () => {
    expect(normalizeEmail(123)).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
    expect(normalizeEmail(undefined)).toBeNull();
  });
});
```

### Integration Tests

Test API routes with realistic scenarios:

```typescript
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/checkout/route";
import { NextRequest } from "next/server";

describe("/api/checkout", () => {
  it("rejects cross-origin requests", async () => {
    const req = new NextRequest("https://example.com/api/checkout", {
      method: "POST",
      headers: {
        origin: "https://evil.com",
        host: "example.com",
      },
    });

    const response = await POST(req);
    expect(response.status).toBe(403);
  });
});
```

### Run Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/unit/security.test.ts

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e
```

## Performance

### Client-Side Processing

Use client-side PDF processing to reduce server load:

```typescript
// ✅ Good - Process PDFs in the browser
import { PDFDocument } from "pdf-lib";

async function compressPDF(file: File) {
  const bytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(bytes);
  
  // Compress images, remove metadata, etc.
  
  const compressed = await pdfDoc.save();
  return new Blob([compressed], { type: "application/pdf" });
}
```

### Lazy Loading

Use dynamic imports for heavy components:

```typescript
import dynamic from "next/dynamic";

// ✅ Good - Load PDF editor only when needed
const PDFEditor = dynamic(() => import("@/components/PDFEditor"), {
  loading: () => <div>Loading editor...</div>,
  ssr: false, // Client-side only
});
```

### Memoization

Use React hooks to prevent unnecessary re-renders:

```typescript
import { useMemo, useCallback } from "react";

function ToolPage() {
  // ✅ Good - Memoize expensive computations
  const processedData = useMemo(() => {
    return heavyComputation(rawData);
  }, [rawData]);

  // ✅ Good - Memoize callbacks
  const handleUpload = useCallback((file: File) => {
    uploadFile(file);
  }, []);

  return <UploadZone onUpload={handleUpload} />;
}
```

## Git Workflow

### Commit Messages

Follow conventional commit format:

```
feat: add idempotency support for checkout API
fix: prevent rate limit bypass in upload endpoint
docs: update security documentation
test: add tests for email validation
refactor: extract constants to centralized file
perf: optimize PDF compression algorithm
```

### Branch Naming

- `feat/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `refactor/what-changed` - Code refactoring
- `docs/what-documented` - Documentation updates

### Pull Requests

1. **Write clear description** of what changed and why
2. **Reference issues** if applicable (#123)
3. **Run tests** before submitting: `npm test`
4. **Check linting**: `npm run lint`
5. **Update documentation** if needed
6. **Request review** from team members

### Code Review Checklist

Before approving a PR, verify:

- [ ] Tests pass (`npm test`)
- [ ] No security vulnerabilities introduced
- [ ] Input validation for all user inputs
- [ ] Proper error handling
- [ ] Logging uses `lib/logger.ts`
- [ ] Constants used instead of magic strings
- [ ] Documentation updated if needed
- [ ] No secrets committed

## Additional Resources

- [Security Documentation](./SECURITY.md)
- [Architecture Guide](./ARCHITECTURE.md)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)

---

**Questions?** Open an issue or reach out to the team.
