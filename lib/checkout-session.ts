import { createHmac } from "crypto";
import { SECURITY } from "./constants";

export interface CheckoutSessionFile {
  name: string;
  pathname: string;
  contentType: string;
  size: number;
}

export interface CheckoutSessionPayload {
  planId: string;
  returnToPath: string;
  createdAt: number;
  expiresAt: number;
  files: CheckoutSessionFile[];
}

const SESSION_TTL_MS = SECURITY.TOKEN_TTL_MS;

function getSecret(): string {
  const secret = process.env.DOWNLOAD_TOKEN_SECRET;
  if (!secret) {
    throw new Error("DOWNLOAD_TOKEN_SECRET environment variable is required.");
  }
  if (secret.length < SECURITY.MIN_SECRET_LENGTH) {
    throw new Error(
      `DOWNLOAD_TOKEN_SECRET must be at least ${SECURITY.MIN_SECRET_LENGTH} characters long.`,
    );
  }
  return secret;
}

function toBase64Url(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded =
    padding === 0 ? normalized : normalized + "=".repeat(4 - padding);
  return Buffer.from(padded, "base64").toString("utf8");
}

function signPayload(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createCheckoutSession(input: {
  planId: string;
  returnToPath: string;
  files: CheckoutSessionFile[];
}): string {
  const now = Date.now();
  const payload: CheckoutSessionPayload = {
    planId: input.planId,
    returnToPath: input.returnToPath,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
    files: input.files,
  };

  const serialized = JSON.stringify(payload);
  const encoded = toBase64Url(serialized);
  const signature = signPayload(encoded);
  return `${encoded}.${signature}`;
}

export function validateCheckoutSession(
  token: string,
): { valid: true; payload: CheckoutSessionPayload } | { valid: false } {
  if (!token || typeof token !== "string") {
    return { valid: false };
  }

  const separatorIndex = token.lastIndexOf(".");
  if (separatorIndex <= 0) {
    return { valid: false };
  }

  const encoded = token.slice(0, separatorIndex);
  const providedSignature = token.slice(separatorIndex + 1);
  const expectedSignature = signPayload(encoded);

  if (providedSignature !== expectedSignature) {
    return { valid: false };
  }

  try {
    const decoded = fromBase64Url(encoded);
    const payload = JSON.parse(decoded) as CheckoutSessionPayload;

    if (
      !payload ||
      typeof payload.planId !== "string" ||
      typeof payload.returnToPath !== "string" ||
      !Array.isArray(payload.files) ||
      typeof payload.createdAt !== "number" ||
      typeof payload.expiresAt !== "number"
    ) {
      return { valid: false };
    }

    if (payload.expiresAt <= Date.now()) {
      return { valid: false };
    }

    const validFiles = payload.files.every(
      (file) =>
        file &&
        typeof file.name === "string" &&
        typeof file.pathname === "string" &&
        typeof file.contentType === "string" &&
        typeof file.size === "number",
    );

    if (!validFiles || payload.files.length === 0) {
      return { valid: false };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}
