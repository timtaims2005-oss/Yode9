---
name: Production Infrastructure Layer
description: Production-readiness additions across api-server and mobile for email, auth, and push notifications
---

## Email (api-server/src/lib/email.ts)
- Resend SDK added as primary provider when RESEND_API_KEY is set
- Nodemailer remains as SMTP fallback (SMTP_HOST)
- Console log as dev fallback when neither is configured
- Wrapper functions expected by routes: sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail, sendInvoiceEmail
- Build (template) functions: buildVerificationEmail, buildPasswordResetEmail, buildWelcomeEmail, buildSecurityAlertEmail, buildInvoiceEmail
**Why:** Resend is more reliable for transactional email (no SMTP setup); nodemailer kept as legacy fallback.

## Mobile Clerk Auth (artifacts/mobile)
- Packages: @clerk/expo + expo-auth-session@~7.0.10 + expo-secure-store@~15.0.8 + expo-web-browser@~15.0.10 + expo-crypto@~15.0.8
- EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=$CLERK_PUBLISHABLE_KEY prepended to dev script in package.json
- app/_layout.tsx: ClerkProvider + ClerkLoaded wrapping full app; push notifications registered here
- app/(auth)/_layout.tsx: redirects signed-in users to (tabs)
- app/(auth)/sign-in.tsx: email/password Clerk Core v3 sign-in (Arabic UI)
- app/(auth)/sign-up.tsx: email/password with email verification step (Arabic UI)
- app/(tabs)/_layout.tsx: checks isSignedIn → redirects to (auth)/sign-in if not; calls setAuthTokenGetter(getToken)
**Why:** Mobile had no auth; Clerk Expo uses bearer tokens (no cookie jar on native).
**How to apply:** Any new protected screen goes in (tabs); unprotected screens go in (auth).

## Push Notifications (artifacts/mobile/lib/notifications.ts)
- expo-notifications@~0.32.17 installed (SDK 54 compatible)
- registerForPushNotifications(), addNotificationListener(), addNotificationResponseListener(), scheduleLocalNotification()
- Notification handler configured for foreground display (alert + sound + badge)
- Auto-registered in root _layout.tsx useEffect on app launch
**Why:** Production apps need push for re-engagement and system alerts.

## Infrastructure already present (no changes needed)
- Redis/BullMQ: lib/redis.ts (ioredis + in-memory fallback) + lib/queue.ts (4 BullMQ queues + in-process fallback when REDIS_URL absent)
- Object Storage: lib/storage.ts (R2/S3/Local polymorphic) + routes/upload.ts (multer, 50MB, mounted at /api/upload)
- Stripe: routes/stripe.ts fully mounted (checkout, webhook, portal, PDF invoice) — needs STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET
- Sentry: lib/telemetry.ts (backend, needs SENTRY_DSN) + mr7-ai/src/lib/sentry.ts (frontend, needs VITE_SENTRY_DSN)
- DB tables: subscriptions, user_subscriptions, invoices, uploaded_files, api_keys

## Env vars needed for full production
- RESEND_API_KEY — Resend email (or SMTP_* for nodemailer)
- STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET — Stripe billing
- SENTRY_DSN + VITE_SENTRY_DSN — Error tracking
- REDIS_URL — BullMQ persistent queues (without it: in-process fallback)
- R2_BUCKET_NAME + R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY — Cloudflare R2 storage (without: local disk)
