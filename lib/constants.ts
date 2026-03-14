/**
 * Application-wide constants
 * Centralized configuration values to avoid magic strings
 */

// ────────────────────────────────────────────────────────────
// Rate Limiting
// ────────────────────────────────────────────────────────────
export const RATE_LIMITS = {
  UPLOAD: {
    MAX_REQUESTS: 20,
    WINDOW_MS: 10 * 60 * 1000, // 10 minutes
  },
  CHECKOUT: {
    MAX_REQUESTS: 8,
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  },
  STATUS_CHECK: {
    MAX_REQUESTS: 60,
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  },
  CRON: {
    MAX_REQUESTS: 30,
    WINDOW_MS: 1 * 60 * 1000, // 1 minute
  },
} as const;

// ────────────────────────────────────────────────────────────
// Security & Validation
// ────────────────────────────────────────────────────────────
export const SECURITY = {
  MAX_EMAIL_LENGTH: 254,
  MAX_TEXT_LENGTH: 500,
  MAX_FILENAME_LENGTH: 80,
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50 MB
  MIN_SECRET_LENGTH: 32,
  TOKEN_TTL_MS: 60 * 60 * 1000, // 1 hour
  EMAIL_DEDUPE_WINDOW_MS: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// ────────────────────────────────────────────────────────────
// API Timeouts
// ────────────────────────────────────────────────────────────
export const API_TIMEOUTS = {
  FLOWPAY_MS: 10_000, // 10 seconds
  MAILTRAP_MS: 12_000, // 12 seconds
  DEFAULT_MS: 10_000, // 10 seconds
} as const;

// ────────────────────────────────────────────────────────────
// File Upload
// ────────────────────────────────────────────────────────────
export const UPLOAD = {
  ALLOWED_CONTENT_TYPES: [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ] as const,
} as const;

// ────────────────────────────────────────────────────────────
// LocalStorage Keys
// ────────────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  DOWNLOAD_AUTHORIZATION: "neo:download-authorization:",
  FREE_USAGE: "neo:free-usage:",
  USER_EMAIL: "neo:user-email",
} as const;

// ────────────────────────────────────────────────────────────
// Payment Status
// ────────────────────────────────────────────────────────────
export const PAYMENT_STATUS = {
  PAID: new Set([
    "PAID",
    "COMPLETED",
    "CONFIRMED",
    "RECEIVED",
    "PIX_PAID",
    "PENDING_REVIEW",
    "APPROVED",
    "SETTLED",
  ]),
  POLLING_INTERVAL_MS: 8000, // 8 seconds
} as const;

// ────────────────────────────────────────────────────────────
// Email Regex (shared)
// ────────────────────────────────────────────────────────────
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ────────────────────────────────────────────────────────────
// Application Info
// ────────────────────────────────────────────────────────────
export const APP_INFO = {
  NAME: "neo-convert",
  DEFAULT_URL: "https://neo-convert.site",
  DEFAULT_FILENAME_FALLBACK: "arquivo",
} as const;
