/**
 * ENV Guard — validates all required environment variables at startup.
 * Call validateEnv() once before the server starts.
 */

import { logger } from "./logger";

const REQUIRED_VARS = ["DATABASE_URL"] as const;

const SENSITIVE_DEFAULTS: Record<string, string> = {
  SESSION_SECRET: "mr7-ai-dev-secret-change-in-prod",
};

export function validateEnv(): void {
  const missing: string[] = [];

  for (const key of REQUIRED_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    logger.fatal(
      { missing },
      `Missing required environment variables: ${missing.join(", ")}. Server will not start.`,
    );
    process.exit(1);
  }

  // Warn about known insecure defaults
  for (const [key, defaultVal] of Object.entries(SENSITIVE_DEFAULTS)) {
    if (!process.env[key]) {
      logger.warn(
        `${key} is not set — using insecure default. Set this variable in production.`,
      );
    } else if (process.env[key] === defaultVal) {
      logger.warn(
        `${key} is set to the known default value — change it in production.`,
      );
    }
  }

  // Warn if INTERNAL_API_KEY is missing
  if (!process.env.INTERNAL_API_KEY) {
    logger.warn(
      "INTERNAL_API_KEY is not set — all protected API routes are accessible without a key. Set this in production.",
    );
  }

  logger.info("Environment validation passed.");
}
