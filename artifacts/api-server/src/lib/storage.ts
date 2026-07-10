/**
 * File Storage Service
 * ─────────────────────
 * Supports:
 *  - Local disk storage (development)
 *  - AWS S3 / Cloudflare R2 (production)
 *
 * Configure via STORAGE_PROVIDER env var ("local" | "s3").
 * For S3/R2: set S3_BUCKET_NAME, S3_REGION, S3_ACCESS_KEY_ID,
 *            S3_SECRET_ACCESS_KEY, and optionally S3_ENDPOINT (for R2).
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
class S3Storage implements StorageProvider {
  private bucket: string;
  private region: string;
  private endpoint?: string;
  private client: unknown = null;

  constructor() {
    this.bucket = process.env.S3_BUCKET_NAME ?? "";
    this.region = process.env.S3_REGION ?? "us-east-1";
    this.endpoint = process.env.S3_ENDPOINT;
  }

  private async getClient() {
    if (this.client) return this.client as {
      send: (cmd: unknown) => Promise<unknown>;
    };
    const { S3Client } = await import("@aws-sdk/client-s3");
    const config: Record<string, unknown> = {
      region: this.region,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
      },
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
    // For Cloudflare R2 with custom domain
    if (process.env.S3_PUBLIC_URL) {
      return `${process.env.S3_PUBLIC_URL}/${key}`;
    }
    // Standard S3 URL
    if (this.endpoint) {
      return `${this.endpoint}/${this.bucket}/${key}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async exists(key: string): Promise<boolean> {
    try {
      const client = await this.getClient();
      const { HeadObjectCommand } = await import("@aws-sdk/client-s3");
      await client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────
let _provider: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (_provider) return _provider;
  const provider = process.env.STORAGE_PROVIDER ?? "local";
  if (provider === "s3") {
    if (!process.env.S3_BUCKET_NAME || !process.env.S3_ACCESS_KEY_ID) {
      logger.warn("[storage] S3 configured but S3_BUCKET_NAME or S3_ACCESS_KEY_ID missing — falling back to local");
      _provider = new LocalStorage();
    } else {
      _provider = new S3Storage();
      logger.info("[storage] S3 storage initialized");
    }
  } else {
    _provider = new LocalStorage();
    logger.info("[storage] Local file storage initialized");
  }
  return _provider;
}

// ── Key Generator ─────────────────────────────────────────────────────────────
export function generateStorageKey(
  userId: string,
  originalName: string,
  prefix = "uploads",
): string {
  const ext = path.extname(originalName).toLowerCase();
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}/${userId}/${ts}-${rand}${ext}`;
}

export const MAX_UPLOAD_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE ?? "52428800", 10); // 50MB default

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
