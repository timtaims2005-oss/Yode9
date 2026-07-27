/**
 * File Storage Service
 * ─────────────────────
 * Supports:
 *  - Local disk storage (development / fallback)
 *  - Cloudflare R2 (production — preferred)
 *  - AWS S3 (alternative)
 *
 * Priority order (auto-detected):
 *  1. STORAGE_PROVIDER=cloudflare-r2  → Cloudflare R2 via S3-compatible API
 *  2. STORAGE_PROVIDER=s3             → AWS S3
 *  3. (default when R2 creds present) → Cloudflare R2
 *  4. (fallback)                      → Local disk
 *
 * Cloudflare R2 required env vars:
 *   CLOUDFLARE_ACCOUNT_ID       — your Cloudflare account ID (already set)
 *   R2_BUCKET_NAME              — name of the R2 bucket (e.g. "mr7-ai-storage")
 *   R2_ACCESS_KEY_ID            — R2 API token access key (from CF dashboard → R2 → Manage API tokens)
 *   R2_SECRET_ACCESS_KEY        — R2 API token secret
 *   R2_PUBLIC_URL (optional)    — public domain/subdomain for serving files
 *
 * AWS S3 required env vars:
 *   S3_BUCKET_NAME, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
 *   S3_ENDPOINT (optional for custom endpoints)
 */

import path from "path";
import fs from "fs";
import { logger } from "./logger.js";

export interface UploadedFile {
  key: string;        // storage key / path
  url: string;        // public URL (if public) or signed URL
  size: number;
  contentType: string;
  originalName: string;
}

export interface StorageProvider {
  upload(file: Buffer, key: string, contentType: string, originalName: string): Promise<UploadedFile>;
  delete(key: string): Promise<void>;
  getUrl(key: string): Promise<string>;
  exists(key: string): Promise<boolean>;
}

// ── Local Storage ─────────────────────────────────────────────────────────────
class LocalStorage implements StorageProvider {
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor() {
    this.uploadDir = process.env.LOCAL_UPLOAD_DIR ?? "./uploads";
    const domain = process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : "http://localhost:8080";
    this.baseUrl = `${domain}/uploads`;
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(file: Buffer, key: string, contentType: string, originalName: string): Promise<UploadedFile> {
    const fullPath = path.join(this.uploadDir, key);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, file);
    return {
      key,
      url: `${this.baseUrl}/${key}`,
      size: file.length,
      contentType,
      originalName,
    };
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(this.uploadDir, key);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  }

  async getUrl(key: string): Promise<string> {
    return `${this.baseUrl}/${key}`;
  }

  async exists(key: string): Promise<boolean> {
    return fs.existsSync(path.join(this.uploadDir, key));
  }
}

// ── S3 / Cloudflare R2 Storage ────────────────────────────────────────────────
// Supports both AWS S3 and Cloudflare R2 (R2 uses S3-compatible API)
class S3Storage implements StorageProvider {
  private bucket: string;
  private region: string;
  private endpoint?: string;
  private publicUrl?: string;
  private client: unknown = null;

  constructor(opts?: {
    bucket?: string;
    region?: string;
    endpoint?: string;
    publicUrl?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  }) {
    this.bucket    = opts?.bucket    ?? process.env.S3_BUCKET_NAME  ?? process.env.R2_BUCKET_NAME  ?? "";
    this.region    = opts?.region    ?? process.env.S3_REGION        ?? "auto";
    this.endpoint  = opts?.endpoint  ?? process.env.S3_ENDPOINT;
    this.publicUrl = opts?.publicUrl ?? process.env.S3_PUBLIC_URL   ?? process.env.R2_PUBLIC_URL;
  }

  private async getClient() {
    if (this.client) return this.client as { send: (cmd: unknown) => Promise<unknown> };

    const { S3Client } = await import("@aws-sdk/client-s3");

    // Resolve credentials — check R2 vars first, then S3 vars
    const accessKeyId     = process.env.R2_ACCESS_KEY_ID     ?? process.env.S3_ACCESS_KEY_ID     ?? "";
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? process.env.S3_SECRET_ACCESS_KEY ?? "";

    const config: Record<string, unknown> = {
      region: this.region,
      credentials: { accessKeyId, secretAccessKey },
    };

    if (this.endpoint) {
      config.endpoint = this.endpoint;
      config.forcePathStyle = true; // required for R2
    }

    this.client = new S3Client(config);
    return this.client as { send: (cmd: unknown) => Promise<unknown> };
  }

  async upload(file: Buffer, key: string, contentType: string, originalName: string): Promise<UploadedFile> {
    const client = await this.getClient();
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    await client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file,
      ContentType: contentType,
      Metadata: { originalName },
    }));
    const url = await this.getUrl(key);
    return { key, url, size: file.length, contentType, originalName };
  }

  async delete(key: string): Promise<void> {
    const client = await this.getClient();
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async getUrl(key: string): Promise<string> {
    if (this.publicUrl) return `${this.publicUrl}/${key}`;
    if (this.endpoint)  return `${this.endpoint}/${this.bucket}/${key}`;
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async exists(key: string): Promise<boolean> {
    try {
      const client = await this.getClient();
      const { HeadObjectCommand } = await import("@aws-sdk/client-s3");
      await client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch { return false; }
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────
let _provider: StorageProvider | null = null;

/**
 * Returns true when all required Cloudflare R2 credentials are present.
 * Required: CLOUDFLARE_ACCOUNT_ID + R2_BUCKET_NAME + R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY
 */
function hasR2Config(): boolean {
  return !!(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY
  );
}

export function getStorage(): StorageProvider {
  if (_provider) return _provider;

  const explicit = process.env.STORAGE_PROVIDER;

  // ── Cloudflare R2 (explicit or auto-detected) ──────────────────────────────
  if (explicit === "cloudflare-r2" || (!explicit && hasR2Config())) {
    if (!hasR2Config()) {
      logger.warn(
        "[storage] STORAGE_PROVIDER=cloudflare-r2 but R2 credentials incomplete — " +
        "set R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY. Falling back to local."
      );
      _provider = new LocalStorage();
      return _provider;
    }
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!;
    _provider = new S3Storage({
      bucket:    process.env.R2_BUCKET_NAME,
      region:    "auto",
      endpoint:  `https://${accountId}.r2.cloudflarestorage.com`,
      publicUrl: process.env.R2_PUBLIC_URL,
    });
    logger.info({ bucket: process.env.R2_BUCKET_NAME }, "[storage] Cloudflare R2 storage initialized");
    return _provider;
  }

  // ── AWS S3 (explicit) ──────────────────────────────────────────────────────
  if (explicit === "s3") {
    if (!process.env.S3_BUCKET_NAME || !process.env.S3_ACCESS_KEY_ID) {
      logger.warn("[storage] STORAGE_PROVIDER=s3 but S3_BUCKET_NAME or S3_ACCESS_KEY_ID missing — falling back to local");
      _provider = new LocalStorage();
    } else {
      _provider = new S3Storage();
      logger.info("[storage] AWS S3 storage initialized");
    }
    return _provider;
  }

  // ── Local (default) ────────────────────────────────────────────────────────
  _provider = new LocalStorage();
  logger.info("[storage] Local file storage initialized (set R2_BUCKET_NAME + R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY to enable Cloudflare R2)");
  return _provider;
}

// ── Key Generator ─────────────────────────────────────────────────────────────
export function generateStorageKey(
  userId: string,
  originalName: string,
  prefix = "uploads",
): string {
  const ext  = path.extname(originalName).toLowerCase();
  const ts   = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}/${userId}/${ts}-${rand}${ext}`;
}

export const MAX_UPLOAD_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE ?? "52428800", 10); // 50 MB default

export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf",
  "text/plain", "text/csv", "text/markdown",
  "application/json",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "video/mp4", "video/webm",
  "audio/mpeg", "audio/wav", "audio/webm",
]);
