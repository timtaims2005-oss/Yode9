import { createCipheriv, createDecipheriv, randomBytes, createHash, timingSafeEqual } from 'crypto';

const ALGO = 'aes-256-gcm';
const KEY_LEN = 32;
const IV_LEN = 12;
const TAG_LEN = 16;

function deriveKey(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

export function encrypt(plaintext: string, secret?: string): string {
  const key = deriveKey(secret || process.env.ENCRYPTION_KEY || 'mr7ai-default-secret-key-do-change');
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decrypt(ciphertext: string, secret?: string): string {
  const key = deriveKey(secret || process.env.ENCRYPTION_KEY || 'mr7ai-default-secret-key-do-change');
  const buf = Buffer.from(ciphertext, 'base64');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const encrypted = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

export function hashValue(value: string, algorithm: 'md5' | 'sha1' | 'sha256' | 'sha512' = 'sha256'): string {
  return createHash(algorithm).update(value).digest('hex');
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function compareHashes(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch { return false; }
}

export function maskSensitive(data: Record<string, any>, fields: string[] = ['password', 'token', 'key', 'secret']): Record<string, any> {
  const masked = { ...data };
  for (const field of fields) {
    for (const key of Object.keys(masked)) {
      if (key.toLowerCase().includes(field)) {
        masked[key] = '***REDACTED***';
      }
    }
  }
  return masked;
}

export default { encrypt, decrypt, hashValue, generateToken, compareHashes, maskSensitive };
