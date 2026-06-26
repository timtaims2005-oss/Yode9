/**
 * Security Headers Middleware
 * ────────────────────────────
 * Configures Helmet.js with strict security headers:
 *   - Content Security Policy (CSP)
 *   - HTTP Strict Transport Security (HSTS)
 *   - X-Frame-Options (clickjacking protection)
 *   - X-Content-Type-Options (MIME sniffing protection)
 *   - Referrer-Policy
 *   - Permissions-Policy
 *   - Cross-Origin-Opener-Policy / Embedder-Policy / Resource-Policy
 */

import helmet from "helmet";
import type { Express } from "express";

const IS_PROD = process.env.NODE_ENV === "production";
const APP_DOMAIN = process.env.APP_DOMAIN || "mr7.ai";
const CDN_ORIGINS = (process.env.CSP_CDN_ORIGINS || "").split(",").filter(Boolean);

/** Apply all security headers to the Express app */
export function applySecurityHeaders(app: Express): void {

  // ── HSTS — force HTTPS (production only) ───────────────────────────────────
  app.use(
    helmet.hsts({
      maxAge: IS_PROD ? 31536000 : 0,
      includeSubDomains: true,
      preload: IS_PROD,
    }),
  );

  // ── X-Frame-Options — anti-clickjacking ────────────────────────────────────
  app.use(helmet.frameguard({ action: "deny" }));

  // ── X-Content-Type-Options — no MIME sniffing ─────────────────────────────
  app.use(helmet.noSniff());

  // ── X-XSS-Protection (legacy browsers) ────────────────────────────────────
  app.use(helmet.xssFilter());

  // ── Referrer-Policy ────────────────────────────────────────────────────────
  app.use(helmet.referrerPolicy({ policy: "strict-origin-when-cross-origin" }));

  // ── Hide X-Powered-By ──────────────────────────────────────────────────────
  app.use(helmet.hidePoweredBy());

  // ── Cross-Origin Policies ──────────────────────────────────────────────────
  app.use(helmet.crossOriginOpenerPolicy({ policy: "same-origin-allow-popups" }));
  app.use(helmet.crossOriginResourcePolicy({ policy: "same-site" }));

  // ── Permissions-Policy (restrict browser features) ─────────────────────────
  app.use((_req, res, next) => {
    res.setHeader(
      "Permissions-Policy",
      [
        "camera=(self)",
        "microphone=(self)",
        "geolocation=()",
        "payment=()",
        "usb=()",
        "magnetometer=()",
        "gyroscope=()",
        "accelerometer=()",
        "autoplay=(self)",
        "fullscreen=(self)",
      ].join(", "),
    );
    next();
  });

  // ── Content Security Policy ─────────────────────────────────────────────────
  const allowedScriptSrc = [
    `'self'`,
    IS_PROD ? "" : `'unsafe-eval'`,
    IS_PROD ? "" : `'unsafe-inline'`,
    `https://${APP_DOMAIN}`,
    `https://*.${APP_DOMAIN}`,
    ...CDN_ORIGINS,
  ].filter(Boolean);

  const allowedConnectSrc = [
    `'self'`,
    `https://${APP_DOMAIN}`,
    `https://*.${APP_DOMAIN}`,
    `wss://${APP_DOMAIN}`,
    `wss://*.${APP_DOMAIN}`,
    ...(IS_PROD ? [] : [
      "https://api.openai.com",
      "https://api.anthropic.com",
      "https://api.groq.com",
      "https://generativelanguage.googleapis.com",
    ]),
  ];

  app.use(
    helmet.contentSecurityPolicy({
      useDefaults: false,
      directives: {
        defaultSrc: [`'self'`],
        scriptSrc: allowedScriptSrc,
        scriptSrcAttr: [`'none'`],
        styleSrc: [`'self'`, `'unsafe-inline'`],
        imgSrc: [`'self'`, "data:", "blob:", "https:"],
        fontSrc: [`'self'`, "data:", "https:"],
        connectSrc: allowedConnectSrc,
        mediaSrc: [`'self'`, "blob:"],
        objectSrc: [`'none'`],
        frameSrc: [`'none'`],
        frameAncestors: [`'none'`],
        formAction: [`'self'`],
        baseUri: [`'self'`],
        upgradeInsecureRequests: IS_PROD ? [] : null,
        workerSrc: [`'self'`, "blob:"],
        manifestSrc: [`'self'`],
        childSrc: [`'self'`, "blob:"],
      },
    }),
  );

  // ── HTTPS redirect (production only) ───────────────────────────────────────
  if (IS_PROD) {
    app.use((req, res, next) => {
      if (req.protocol !== "https" && req.headers["x-forwarded-proto"] !== "https") {
        res.redirect(301, `https://${req.hostname}${req.originalUrl}`);
        return;
      }
      next();
    });
  }
}
