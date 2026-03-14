---
applyTo: "**/*.{ts,tsx}"
---

# TypeScript/React Conventions — neo-convert

## React 19
- Use Server Components by default
- `'use client'` only for interactive components (forms, state, effects)
- Use `use()` for promise unwrapping in Server Components
- Use `useFormStatus()` for form submission states
- Use `useOptimistic()` for optimistic UI updates

## Next.js 16 App Router
- File conventions: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
- Use Server Actions for mutations (`'use server'`)
- Use `generateMetadata()` for SEO
- Dynamic routes: `[param]/page.tsx`

## Tailwind CSS 4
- Use `@theme` directive for design tokens
- CSS custom properties for dynamic values
- No `tailwind.config.js` — configuration is in CSS

## PDF Processing
- Always import from `pdf-lib`
- Validate inputs before creating/modifying PDFs
- Handle `PDFDocument.load()` errors gracefully (corrupted files)
- Clean up buffers after processing
