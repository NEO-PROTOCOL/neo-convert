# Security Documentation

## Overview

This document outlines the security architecture, threat model, and mitigation strategies for the neo-convert application.

## Table of Contents

- [Architecture Security](#architecture-security)
- [Threat Model](#threat-model)
- [Security Controls](#security-controls)
- [Known Limitations](#known-limitations)
- [Security Best Practices](#security-best-practices)
- [Incident Response](#incident-response)

## Architecture Security

### Defense in Depth

neo-convert implements multiple layers of security:

1. **Network Layer**: HTTPS-only, CSP headers, CORS policies
2. **Application Layer**: Input validation, rate limiting, CSRF protection
3. **Data Layer**: Token-based authorization, secure file handling
4. **Infrastructure Layer**: Vercel security, environment isolation

### Security Boundaries

```
┌─────────────────────────────────────────────────────────┐
│  Client (Browser)                                       │
│  - LocalStorage (short-lived tokens)                    │
│  - Client-side PDF processing (pdf-lib)                 │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS Only
                     │ CSP Headers
┌────────────────────▼────────────────────────────────────┐
│  Next.js API Routes (Edge/Serverless Functions)         │
│  - Input validation                                      │
│  - Rate limiting                                         │
│  - CSRF protection                                       │
│  - Authentication                                        │
└────────────────────┬────────────────────────────────────┘
                     │ Authenticated Requests
                     │ API Keys
┌────────────────────▼────────────────────────────────────┐
│  External Services                                       │
│  - Vercel Blob (file storage)                           │
│  - FlowPay API (payments)                               │
│  - Mailtrap (email)                                      │
└─────────────────────────────────────────────────────────┘
```

## Threat Model

### Assets

1. **User Data**: Email addresses, filenames, payment information
2. **Application Secrets**: API keys, token signing secrets
3. **File Content**: User-uploaded PDFs and images (temporary storage)
4. **Payment Data**: Transaction IDs, payment status

### Threat Actors

1. **Script Kiddies**: Automated scanners, known exploit attempts
2. **Malicious Users**: Abuse of free tier, DOS attempts
3. **Data Harvesters**: Email address collection
4. **Payment Fraudsters**: Fake payment attempts, chargebacks

### Attack Vectors

#### 1. Injection Attacks

**SQL/NoSQL Injection**: N/A (no database)

**XSS (Cross-Site Scripting)**
- **Risk**: MEDIUM
- **Attack**: Malicious scripts in user-controlled fields (filename, email)
- **Mitigation**: 
  - HTML escaping via `escapeHtml()` in email templates
  - CSP headers prevent inline script execution
  - React's built-in XSS protection
  - Filename sanitization with NFKD normalization

**Command Injection**: N/A (no shell commands)

#### 2. Authentication & Authorization

**Broken Authentication**
- **Risk**: LOW
- **Attack**: Token theft, session hijacking
- **Mitigation**:
  - HMAC-SHA256 signed tokens
  - 1-hour token TTL
  - Tokens stored in HttpOnly + Secure + SameSite=Lax cookies (not readable by JS)
  - Token validation on every request
  - Token lookup persisted in Turso (libSQL), revocable independent of cookie

**Insecure Direct Object References**
- **Risk**: LOW
- **Attack**: Access to unauthorized charge IDs or blob URLs
- **Mitigation**:
  - Charge IDs validated against strict regex
  - Blob URLs scoped to Vercel domain only
  - Download tokens required for upload

#### 3. Denial of Service

**Rate Limit Bypass**
- **Risk**: MEDIUM (serverless limitation)
- **Attack**: Overwhelming API with requests
- **Mitigation**:
  - Per-IP rate limiting (in-memory)
  - Different limits per endpoint
  - 429 responses with Retry-After headers
  - **Limitation**: Resets on cold start (see Known Limitations)

**Resource Exhaustion**
- **Risk**: LOW
- **Attack**: Upload massive files
- **Mitigation**:
  - 50 MB file size limit
  - 10-second request timeouts
  - Strict content-type whitelist
  - Client-side processing (offloads server)

#### 4. Data Exposure

**Sensitive Data in Logs**
- **Risk**: MEDIUM
- **Attack**: N/A (operational risk)
- **Mitigation**:
  - Structured logging with PII redaction (lib/logger.ts)
  - Email addresses masked in logs
  - Secrets never logged
  - **Action Required**: Migrate from console.log to logger

**Sensitive Data in URLs**
- **Risk**: MEDIUM
- **Attack**: Email exposure in query parameters
- **Location**: `/api/checkout/status/[chargeId]` GET params
- **Mitigation**: 
  - Same-origin enforcement
  - Short-lived URLs
  - **Recommendation**: Move to POST body

#### 5. Third-Party Risks

**Dependency Vulnerabilities**
- **Risk**: VARIABLE
- **Attack**: Exploiting known CVEs
- **Mitigation**:
  - Regular `npm audit` checks
  - Automated Dependabot alerts
  - Version pinning with `package-lock.json`
  - PNPM overrides for critical packages (undici)

**Supply Chain Attacks**
- **Risk**: LOW
- **Attack**: Malicious package injection
- **Mitigation**:
  - Minimal dependency footprint (26 direct dependencies)
  - Trusted packages only (Vercel, React, Next.js)
  - Lock file integrity checks

## Security Controls

### Input Validation

All user inputs are validated through `/lib/security.ts`:

```typescript
// Email validation
normalizeEmail(input) // Max 254 chars, regex validation

// Text validation
normalizeText(input, maxLength) // Whitespace normalization, length limit

// Filename sanitization
safeFilename(input) // NFKD normalization, special char removal

// Charge ID validation
sanitizeChargeId(input) // Alphanumeric only, length constraints
```

### Rate Limiting

Implemented per-endpoint in `/lib/rate-limit.ts`:

| Endpoint | Limit | Window |
|----------|-------|--------|
| Upload | 20 requests | 10 minutes |
| Checkout | 8 requests | 15 minutes |
| Status Check | 60 requests | 15 minutes |
| Cron Job | 30 requests | 1 minute |

**Response**: HTTP 429 with `Retry-After` header

### CSRF Protection

All state-changing endpoints enforce same-origin:

```typescript
// lib/security.ts
isSameOriginRequest(req) // Validates Origin vs Host headers
```

**Endpoints Protected**:
- `/api/upload-to-cloud` (POST)
- `/api/checkout` (POST)

### Content Security Policy

CSP is emitted per-request by `proxy.ts` (Next.js 16 middleware). Every HTML
request gets a fresh nonce; framework-rendered `<script>` tags carry that
nonce, and `strict-dynamic` authorizes any script transitively loaded by them.

**Production policy**:

```
default-src 'self'
script-src 'self' 'nonce-{random}' 'strict-dynamic' https://vercel.live
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
img-src 'self' data: blob: https:
connect-src 'self' https://api.flowpay.cash https://send.api.mailtrap.io
             https://*.blob.vercel-storage.com https://vercel.live
             wss://ws-us3.pusher.com wss://*.pusher.com
frame-ancestors 'none'
object-src 'none'
upgrade-insecure-requests
```

**Development policy** retains `'unsafe-eval'` because Turbopack's HMR client
relies on `eval` to hot-swap modules. Inline scripts are still blocked.

**Static headers** (X-Frame-Options, Referrer-Policy, HSTS, etc.) remain in
`next.config.ts#headers()` and apply uniformly to all routes, including the
`/api/*` surface the proxy doesn't cover.

### File Upload Security

1. **Content-Type Whitelist**: Only PDF, images, Office formats
2. **File Size Limit**: 50 MB maximum
3. **Filename Sanitization**: Path traversal prevention
4. **Blob Storage**: Vercel Blob with signed URLs
5. **Access Control**: Public (processed) vs private (original) blobs

### Secrets Management

**Environment Variables**:
- `DOWNLOAD_TOKEN_SECRET` (required, min 32 chars)
- `CRON_SECRET` (required for scheduled jobs)
- `FLOWPAY_INTERNAL_API_KEY` (payment API)
- `MAILTRAP_API_TOKEN` (email service)

**Best Practices**:
- Never commit secrets to Git
- Use Vercel environment variables for production
- Rotate secrets quarterly
- Use different secrets per environment

### Authentication Tokens

**Download Tokens** (lib/download-token.ts):
- HMAC-SHA256 signature, compared with `timingSafeEqual`
- Format: `{uuid}:{signature}`
- 1-hour TTL
- Persisted in Turso (libSQL) with explicit `expires_at`; expired rows are
  deleted by the daily cron
- Delivered to the browser as an HttpOnly + Secure + SameSite=Lax cookie
  (`neo_download_token`); never returned in JSON bodies, URL params, or
  Referer headers

**Security Properties**:
- Cannot be forged (HMAC)
- Cannot be reused after expiry
- Scoped to correlation ID and plan ID
- Not readable by client-side JS (HttpOnly), reducing XSS exfiltration risk

## Known Limitations

### 1. State Stores

All KV-like state now lives in **Turso (libSQL)** via `@libsql/client`:

- Rate limiter (`lib/rate-limit.ts`) → table `rate_limits`
- Download token store (`lib/download-token.ts`) → table `download_tokens`
- Email deduplication (`lib/payment-email-dedup.ts`) → table `sent_payment_emails`

**Properties**:
- Persistent across cold starts and deployments
- Shared across parallel function instances (single logical DB)
- Atomic operations (`INSERT ON CONFLICT DO UPDATE RETURNING`,
  `INSERT OR IGNORE`) avoid race conditions
- Expired rows swept by the daily cron (`cleanupExpiredTurso`)

### 2. Polling-Based Payment Status

**Current**: Client polls `/api/checkout/status/[chargeId]` every 8 seconds

**Issues**:
- Inefficient (wasted requests)
- Delayed updates (up to 8 seconds)
- Increased rate limit pressure

**Recommendation**:
- Implement webhook receiver for FlowPay events
- Use Server-Sent Events (SSE) or WebSocket for real-time updates
- Client subscribes to payment channel

### 3. Email in Query Parameters

**Location**: `/api/checkout/status/[chargeId]?notifyEmail=...`

**Risk**: Email addresses logged in server logs, CDN logs, proxy logs

**Mitigation** (Implemented):
- Same-origin enforcement
- Short-lived URLs

**Recommendation**:
- Move email to POST body
- Use encrypted session tokens instead

## Security Best Practices

### For Developers

1. **Never log sensitive data**
   - Use `lib/logger.ts` instead of `console.log`
   - PII is automatically redacted

2. **Validate all inputs**
   - Use helpers from `lib/security.ts`
   - Fail closed (reject if validation fails)

3. **Use constants**
   - Import from `lib/constants.ts`
   - No magic strings or numbers

4. **Handle errors safely**
   - Don't expose internal details to users
   - Log full errors internally with context

5. **Test security controls**
   - Add tests for validation, rate limiting, CSRF
   - Use `tests/unit/security.test.ts` as reference

### For Operations

1. **Rotate secrets regularly**
   - DOWNLOAD_TOKEN_SECRET: every 90 days
   - API keys: when employees leave

2. **Monitor rate limits**
   - Alert on excessive 429 responses
   - Track per-IP patterns

3. **Review logs weekly**
   - Look for attack patterns
   - Failed validation attempts
   - Unusual error rates

4. **Update dependencies monthly**
   - Run `npm audit` and `npm audit fix`
   - Review Dependabot PRs promptly

5. **Test disaster recovery**
   - Secret rotation process
   - Service outage handling

## Incident Response

### Security Incident Severity

**Critical** (P0):
- Secret exposure (API keys, tokens)
- Active data breach
- Payment system compromise

**High** (P1):
- Dependency vulnerability (CVSS > 7)
- DDoS attack affecting availability
- Authentication bypass

**Medium** (P2):
- Rate limit bypass
- XSS vulnerability
- Information disclosure

**Low** (P3):
- Weak configuration
- Missing security header
- Outdated dependency (low risk)

### Response Procedure

1. **Detection** (0-15 minutes)
   - Automated alerts (Vercel, Dependabot)
   - User reports
   - Security scanning

2. **Containment** (15-60 minutes)
   - Rotate compromised secrets immediately
   - Block malicious IPs (via middleware)
   - Disable affected endpoints if needed

3. **Investigation** (1-4 hours)
   - Review logs with `lib/logger.ts` context
   - Identify scope of compromise
   - Document timeline

4. **Remediation** (4-24 hours)
   - Deploy hotfix
   - Update dependencies
   - Patch vulnerabilities

5. **Communication** (24-48 hours)
   - Notify affected users (if PII compromised)
   - Post-mortem document
   - Update security documentation

### Incident Contacts

- **Security Lead**: [Insert contact]
- **Operations**: [Insert contact]
- **Vercel Support**: https://vercel.com/support

## Compliance

### Data Protection

**LGPD (Brazilian GDPR)**:
- User emails collected with consent
- Data minimization (no unnecessary collection)
- Right to deletion (manual process)
- Data retention: 24 hours for failed payments, 90 days for successful

**PCI DSS**:
- No credit card data stored locally
- Payment processing delegated to FlowPay (PCI compliant)

### Security Standards

**OWASP Top 10 (2021)**:
- ✅ A01: Broken Access Control (rate limiting, validation)
- ✅ A02: Cryptographic Failures (HTTPS, HMAC tokens)
- ✅ A03: Injection (input validation, escaping)
- ✅ A04: Insecure Design (defense in depth)
- ✅ A05: Security Misconfiguration (CSP, headers)
- ✅ A06: Vulnerable Components (npm audit)
- ✅ A07: Authentication Failures (token validation)
- ⚠️ A08: Data Integrity Failures (TODO: add request signing)
- ✅ A09: Security Logging (structured logging)
- ✅ A10: SSRF (URL validation, whitelist)

## Security Roadmap

### Q1 2026 (Current)
- [x] Implement structured logging with PII redaction
- [x] Consolidate security constants
- [x] Fix dependency vulnerabilities
- [x] Add security documentation
- [x] Migrate KV state to Turso (libSQL) for persistence
- [x] Move download token from query string to HttpOnly cookie
- [x] Harden CSP — drop `unsafe-inline`/`unsafe-eval` in production, adopt per-request nonces + `strict-dynamic`

### Q2 2026
- [ ] Implement webhook-based payment updates
- [ ] Add request idempotency keys
- [ ] Move email from query params to POST body
- [ ] Add security monitoring dashboard

### Q3 2026
- [ ] Security audit by third party
- [ ] Penetration testing
- [ ] Add WAF rules for common attacks
- [ ] Implement anomaly detection

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [Vercel Security](https://vercel.com/docs/security)
- [LGPD Compliance](https://www.gov.br/esporte/pt-br/acesso-a-informacao/lgpd)

---

**Last Updated**: 2026-03-14  
**Document Owner**: Security Team  
**Next Review**: 2026-06-14
