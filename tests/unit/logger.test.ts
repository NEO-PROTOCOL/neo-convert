// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { logger, createLogger } from "@/lib/logger";

describe("logger", () => {
  it("redacts email addresses partially", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    
    logger.info("User login", { email: "test@example.com" });
    
    expect(consoleSpy).toHaveBeenCalled();
    const logCall = JSON.stringify(consoleSpy.mock.calls[0]);
    expect(logCall).toMatch(/t\*\*t@example\.com/);
    
    consoleSpy.mockRestore();
  });

  it("redacts sensitive fields completely", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    
    logger.info("Authentication", {
      username: "john",
      password: "secret123",
      token: "abc123",
      apiKey: "key456",
    });
    
    expect(consoleSpy).toHaveBeenCalled();
    const logCall = consoleSpy.mock.calls[0][1];
    const context = logCall;
    
    expect(JSON.stringify(context)).toContain("[REDACTED]");
    expect(JSON.stringify(context)).not.toContain("secret123");
    expect(JSON.stringify(context)).not.toContain("abc123");
    
    consoleSpy.mockRestore();
  });

  it("handles nested objects", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    
    logger.info("Payment", {
      user: {
        email: "john@test.com",
        password: "hidden",
      },
      amount: 100,
    });
    
    expect(consoleSpy).toHaveBeenCalled();
    const logCall = consoleSpy.mock.calls[0][1];
    
    expect(JSON.stringify(logCall)).toContain("[REDACTED]");
    expect(JSON.stringify(logCall)).toMatch(/j\*\*n@test\.com/);
    
    consoleSpy.mockRestore();
  });

  it("creates child logger with default context", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    
    const childLogger = createLogger({ service: "payment" });
    childLogger.info("Transaction", { id: "tx-123" });
    
    expect(consoleSpy).toHaveBeenCalled();
    const logCall = consoleSpy.mock.calls[0][1];
    
    expect(JSON.stringify(logCall)).toContain("payment");
    expect(JSON.stringify(logCall)).toContain("tx-123");
    
    consoleSpy.mockRestore();
  });

  it("respects log levels", () => {
    const env = process.env as Record<string, string | undefined>;
    const originalEnv = env.NODE_ENV;
    env.NODE_ENV = "production";
    
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    
    logger.debug("Debug message");
    
    expect(consoleSpy).not.toHaveBeenCalled();
    
    env.NODE_ENV = originalEnv;
    consoleSpy.mockRestore();
  });
});
