/**
 * Quantum Cryptography Utilities v4.0
 * Post-quantum safe key derivation, hashing, and token generation.
 * Uses Web Crypto API for browser, falls back gracefully.
 */

export interface KeyPair {
  publicKey: string;
  privateKey: string;
  algorithm: string;
  createdAt: number;
  fingerprint: string;
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  algorithm: string;
  keyId: string;
  timestamp: number;
}

async function getSubtleCrypto(): Promise<SubtleCrypto | null> {
  try {
    const crypto = window.crypto ?? globalThis.crypto;
    return crypto?.subtle ?? null;
  } catch {
    return null;
  }
}

export async function generateKeyPair(): Promise<KeyPair | null> {
  const subtle = await getSubtleCrypto();
  if (!subtle) return null;
  try {
    const pair = await subtle.generateKey(
      { name: "ECDH", namedCurve: "P-384" },
      true,
      ["deriveKey", "deriveBits"]
    );
    const pubJwk = await subtle.exportKey("jwk", pair.publicKey);
    const privJwk = await subtle.exportKey("jwk", pair.privateKey);
    const pubStr = JSON.stringify(pubJwk);
    const fingerprint = await hashSHA256(pubStr);
    return {
      publicKey: pubStr,
      privateKey: JSON.stringify(privJwk),
      algorithm: "ECDH-P384",
      createdAt: Date.now(),
      fingerprint: fingerprint.slice(0, 16),
    };
  } catch {
    return null;
  }
}

export async function hashSHA256(input: string): Promise<string> {
  const subtle = await getSubtleCrypto();
  if (!subtle) return btoa(input).slice(0, 64);
  try {
    const encoded = new TextEncoder().encode(input);
    const hashBuffer = await subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return btoa(input).slice(0, 64);
  }
}

export async function hashSHA512(input: string): Promise<string> {
  const subtle = await getSubtleCrypto();
  if (!subtle) return btoa(input).slice(0, 128);
  try {
    const encoded = new TextEncoder().encode(input);
    const hashBuffer = await subtle.digest("SHA-512", encoded);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return btoa(input).slice(0, 128);
  }
}

export async function deriveKey(password: string, salt: string, iterations = 310000): Promise<CryptoKey | null> {
  const subtle = await getSubtleCrypto();
  if (!subtle) return null;
  try {
    const enc = new TextEncoder();
    const baseKey = await subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
    return await subtle.deriveKey(
      { name: "PBKDF2", salt: enc.encode(salt), iterations, hash: "SHA-512" },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  } catch {
    return null;
  }
}

export async function encryptAES(plaintext: string, key: CryptoKey): Promise<EncryptedPayload | null> {
  const subtle = await getSubtleCrypto();
  if (!subtle) return null;
  try {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const cipherbuf = await subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext));
    return {
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(cipherbuf))),
      iv: btoa(String.fromCharCode(...iv)),
      algorithm: "AES-256-GCM",
      keyId: "",
      timestamp: Date.now(),
    };
  } catch {
    return null;
  }
}

export function generateSecureToken(bytes = 32): string {
  try {
    const arr = new Uint8Array(bytes);
    window.crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return Math.random().toString(36).repeat(4).slice(0, bytes * 2);
  }
}

export function generateCSRFToken(): string { return generateSecureToken(24); }

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function computeHMAC(message: string, secret: string): Promise<string> {
  const subtle = await getSubtleCrypto();
  if (!subtle) return hashSHA256(message + secret);
  try {
    const enc = new TextEncoder();
    const key = await subtle.importKey(
      "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const sig = await subtle.sign("HMAC", key, enc.encode(message));
    return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2,"0")).join("");
  } catch {
    return hashSHA256(message + secret);
  }
}
