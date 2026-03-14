# AGENTS.md — neo-convert

## Project Overview
NΞØ CONVΞRT — PDF tools SaaS built with Next.js 16 + React 19 on Vercel.

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS 4, Framer Motion
- **PDF**: pdf-lib
- **Storage**: Vercel Blob
- **E2E**: Playwright
- **Unit**: Vitest
- **Deploy**: Vercel
- **Package Manager**: pnpm

## How to Build & Test
```bash
pnpm install
pnpm dev          # local dev server
pnpm build        # production build
pnpm test         # vitest
pnpm test:e2e     # playwright
pnpm lint
```

## Key Patterns

### Adding a New PDF Tool
1. Create page at `app/<tool-name>/page.tsx` (Server Component)
2. Create client component for interactive UI
3. Create Server Action or API route for PDF processing
4. Use `pdf-lib` for all PDF operations
5. Add to tool listing/navigation
6. Add E2E test in `e2e/<tool-name>.spec.ts`

### File Upload Flow
1. Client uploads file via form
2. Server validates size + type
3. Process with pdf-lib
4. Store result in Vercel Blob (temporary)
5. Return download link
6. Clean up after expiry

## Rules
- pnpm only
- App Router only — no Pages Router
- Server Components by default
- React 19 features (use(), useFormStatus)
- Tailwind CSS 4 syntax (@theme directive)
- pdf-lib for all PDF operations
- Never modify payment/legal pages without approval
- Never log payment details
- Validate all uploads server-side
- Run tests before committing
