/**
 * Environment variable validation utility
 * Validates required environment variables on startup
 */

interface EnvVar {
  name: string;
  required: boolean;
  minLength?: number;
  validator?: (value: string) => boolean;
  description: string;
}

const ENV_VARS: EnvVar[] = [
  {
    name: "DOWNLOAD_TOKEN_SECRET",
    required: true,
    minLength: 32,
    description:
      "Secret for signing download tokens (generate with: openssl rand -hex 32)",
  },
  {
    name: "CRON_SECRET",
    required: true,
    minLength: 32,
    description: "Secret for authenticating cron jobs",
  },
  {
    name: "FLOWPAY_INTERNAL_API_KEY",
    required: false,
    description: "API key for FlowPay payment service",
  },
  {
    name: "MAILTRAP_API_TOKEN",
    required: false,
    description: "API token for Mailtrap email service",
  },
  {
    name: "BLOB_READ_WRITE_TOKEN",
    required: false,
    description: "Vercel Blob storage read/write token",
  },
  {
    name: "RAPIDAPI_KEY",
    required: false, // Set to false to not break dev if key is missing initially
    description: "RapidAPI key for OCR service",
  },
  {
    name: "RAPIDAPI_HOST",
    required: false,
    description:
      "RapidAPI host for OCR service (e.g., ocr-scanner.p.rapidapi.com)",
  },
  {
    name: "NEXT_PUBLIC_APP_URL",
    required: false,
    validator: (value) => {
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    },
    description: "Public URL of the application",
  },
];

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate all environment variables
 * Call this early in your application startup
 */
export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.name];

    // Check if required variable is missing
    if (envVar.required && !value) {
      errors.push(`Missing required environment variable: ${envVar.name}`);
      errors.push(`  → ${envVar.description}`);
      continue;
    }

    // Skip optional variables that are not set
    if (!value) {
      if (!envVar.required) {
        warnings.push(`Optional environment variable not set: ${envVar.name}`);
      }
      continue;
    }

    // Check minimum length
    if (envVar.minLength && value.length < envVar.minLength) {
      errors.push(
        `${envVar.name} must be at least ${envVar.minLength} characters long (current: ${value.length})`,
      );
    }

    // Run custom validator
    if (envVar.validator && !envVar.validator(value)) {
      errors.push(`${envVar.name} has an invalid value`);
      errors.push(`  → ${envVar.description}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate and throw if invalid
 * Use this in production to fail fast on startup
 */
export function validateEnvironmentOrThrow(): void {
  const result = validateEnvironment();

  if (!result.valid) {
    const message = [
      "❌ Environment validation failed:",
      "",
      ...result.errors,
      "",
      "Please check your .env.local file or environment variables.",
      "See .env.example for reference.",
    ].join("\n");

    throw new Error(message);
  }

  if (result.warnings.length > 0 && process.env.NODE_ENV !== "test") {
    console.warn("⚠️  Environment warnings:");
    result.warnings.forEach((warning) => console.warn(`  ${warning}`));
  }
}

/**
 * Get a required environment variable
 * Throws if the variable is not set
 */
export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Required environment variable ${name} is not set. ` +
        `Please check your .env.local file.`,
    );
  }
  return value;
}

/**
 * Get an optional environment variable with a default value
 */
export function getOptionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}
