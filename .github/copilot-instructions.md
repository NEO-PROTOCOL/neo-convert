# Copilot Instructions — neo-convert

## Project Overview
NΞØ CONVΞRT — PDF tools SaaS. Compress, merge, split, convert (Word/Excel/JPG ↔ PDF), protect, rotate, sign, AI summary. Next.js 16 + React 19 frontend deployed on Vercel.

## Architecture
- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS 4, Framer Motion
- **PDF Processing**: pdf-lib
- **Storage**: Vercel Blob
- **Analytics**: Vercel Analytics
- **E2E Tests**: Playwright
- **Unit Tests**: Vitest
- **Deploy**: Vercel
- **Package Manager**: pnpm

## Critical Conventions

### Next.js 16 + React 19
- Use Server Components by default — add `'use client'` only when needed
- Use React 19 features: `use()`, `useFormStatus()`, `useOptimistic()`
- Do NOT suggest Next.js 14/15 patterns (Pages Router, `getServerSideProps`)
- App Router: layouts, loading, error boundaries follow file conventions

### PDF Processing
- All PDF operations use `pdf-lib` — do NOT suggest alternative libraries
- File processing happens server-side (API routes or Server Actions)
- Always validate file size and type before processing
- Clean up temporary files after processing

### Payment Flow
- Checkout flow exists — never modify payment endpoints without explicit approval
- Validate all payment-related inputs server-side
- Never log payment details

### Legal Pages
- Privacy policy, terms of service, security pages exist
- Do NOT modify legal content without explicit request

## What NOT To Do
- Do NOT suggest Pages Router patterns — this is App Router only
- Do NOT suggest React class components — functional only
- Do NOT use npm — use pnpm
- Do NOT add PDF libraries besides pdf-lib without approval
- Do NOT modify payment or legal pages without explicit request

## Tailwind CSS 4
- Use Tailwind CSS 4 syntax — `@theme` directive, not `tailwind.config.js`
- Use CSS custom properties for theming
