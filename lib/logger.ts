/**
 * Structured logging utility
 * Provides consistent logging with PII redaction and structured metadata
 */

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogContext {
  [key: string]: unknown;
}

/**
 * Redacts sensitive information from log data
 */
function redactSensitiveData(data: unknown): unknown {
  if (typeof data !== "object" || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(redactSensitiveData);
  }

  const redacted: Record<string, unknown> = {};
  const sensitiveKeys = [
    "password",
    "token",
    "secret",
    "apikey",
    "api_key",
    "authorization",
    "creditcard",
    "credit_card",
    "ssn",
    "cpf",
  ];

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    
    // Partially redact email addresses
    if (lowerKey.includes("email") && typeof value === "string") {
      const [localPart, domain] = value.split("@");
      if (localPart && domain) {
        const maskedLocal = localPart.length > 2
          ? `${localPart[0]}${"*".repeat(localPart.length - 2)}${localPart[localPart.length - 1]}`
          : "***";
        redacted[key] = `${maskedLocal}@${domain}`;
      } else {
        redacted[key] = "***@***.***";
      }
      continue;
    }

    // Fully redact sensitive fields
    if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
      redacted[key] = "[REDACTED]";
      continue;
    }

    // Recursively process nested objects
    redacted[key] = redactSensitiveData(value);
  }

  return redacted;
}

/**
 * Format and output structured log entry
 */
function logEntry(level: LogLevel, message: string, context?: LogContext): void {
  const timestamp = new Date().toISOString();
  const redactedContext = context ? redactSensitiveData(context) : undefined;

  const entry = {
    timestamp,
    level,
    message,
    ...(redactedContext && { context: redactedContext }),
  };

  // In production, this could be sent to a logging service
  // For now, we use console with structured JSON
  const logFn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  
  if (process.env.NODE_ENV === "production") {
    logFn(JSON.stringify(entry));
  } else {
    // Development: more readable format
    logFn(`[${timestamp}] ${level.toUpperCase()}: ${message}`, redactedContext || "");
  }
}

export const logger = {
  info: (message: string, context?: LogContext) => logEntry("info", message, context),
  warn: (message: string, context?: LogContext) => logEntry("warn", message, context),
  error: (message: string, context?: LogContext) => logEntry("error", message, context),
  debug: (message: string, context?: LogContext) => {
    if (process.env.NODE_ENV !== "production") {
      logEntry("debug", message, context);
    }
  },
};

/**
 * Create a child logger with predefined context
 */
export function createLogger(defaultContext: LogContext) {
  return {
    info: (message: string, context?: LogContext) =>
      logger.info(message, { ...defaultContext, ...context }),
    warn: (message: string, context?: LogContext) =>
      logger.warn(message, { ...defaultContext, ...context }),
    error: (message: string, context?: LogContext) =>
      logger.error(message, { ...defaultContext, ...context }),
    debug: (message: string, context?: LogContext) =>
      logger.debug(message, { ...defaultContext, ...context }),
  };
}
