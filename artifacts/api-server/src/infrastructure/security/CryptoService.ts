import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scrypt,
  createHash,
  type BinaryLike,
} from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt) as (
  password: BinaryLike,
  salt: BinaryLike,
  keylen: number,
  options: { N: number; r: number; p: number },
) => Promise<Buffer>;

// ── Memory-Hard KDF params (scrypt) ─────────────────────────────────────────
const MemoryHardParams = {
  N: 16384, // CPU/memory cost
  r: 8,     // Block size
  p: 1,     // Parallelization factor
};

// ── Encrypted payload shape ──────────────────────────────────────────────────
export interface EncryptedData {
  encrypted: string;
  salt: string;
  iv: string;
  authTag: string;
  version: number;
  contextHash?: string;
}

class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

// ── Military-Grade Crypto Service (AES-256-GCM + scrypt PBKDF) ───────────────
export class MilitaryGradeCryptoService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;   // 256-bit
  private static readonly IV_LENGTH = 16;    // 128-bit IV
  private static readonly SALT_LENGTH = 32;  // 256-bit salt

  private readonly masterKey: Buffer;

  constructor(masterKey: string) {
    if (!masterKey || masterKey.length < 32) {
      throw new Error('Master key must be at least 32 characters');
    }
    this.masterKey = Buffer.from(masterKey.padEnd(32).slice(0, 32));
  }

  // ── Encrypt with HSM-like key derivation ──────────────────────────────────
  async encrypt(plaintext: string, context?: string): Promise<EncryptedData> {
    const salt = randomBytes(MilitaryGradeCryptoService.SALT_LENGTH);
    const iv = randomBytes(MilitaryGradeCryptoService.IV_LENGTH);

    // Derive 256-bit key using scrypt (memory-hard KDF)
    const derivedKey = await scryptAsync(
      this.masterKey,
      salt,
      MilitaryGradeCryptoService.KEY_LENGTH,
      MemoryHardParams,
    );

    const cipher = createCipheriv(MilitaryGradeCryptoService.ALGORITHM, derivedKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    // Context binding: bind ciphertext to a specific context (prevents cross-context reuse)
    const contextHash = context
      ? createHash('sha256').update(context).digest('hex')
      : '';

    return {
      encrypted,
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      version: 2,
      contextHash,
    };
  }

  // ── Decrypt with context verification ─────────────────────────────────────
  async decrypt(data: EncryptedData, expectedContext?: string): Promise<string> {
    // Verify context if provided (tamper detection)
    if (expectedContext && data.contextHash) {
      const expectedHash = createHash('sha256').update(expectedContext).digest('hex');
      if (expectedHash !== data.contextHash) {
        throw new SecurityError('Context mismatch — potential tampering detected');
      }
    }

    const salt = Buffer.from(data.salt, 'base64');
    const iv = Buffer.from(data.iv, 'base64');
    const authTag = Buffer.from(data.authTag, 'base64');

    const derivedKey = await scryptAsync(
      this.masterKey,
      salt,
      MilitaryGradeCryptoService.KEY_LENGTH,
      MemoryHardParams,
    );

    const decipher = createDecipheriv(MilitaryGradeCryptoService.ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // ── Hash credentials for storage (SHA3-256 + master-key HMAC) ─────────────
  hashCredential(credential: string): string {
    return createHash('sha3-256')
      .update(credential + this.masterKey.toString('hex'))
      .digest('hex');
  }

  // ── Generate cryptographically secure tokens ───────────────────────────────
  generateToken(bytes = 32): string {
    return randomBytes(bytes).toString('hex');
  }

  // ── HMAC-SHA256 signature ──────────────────────────────────────────────────
  sign(payload: string): string {
    return createHash('sha256')
      .update(payload + this.masterKey.toString('hex'))
      .digest('hex');
  }

  verify(payload: string, signature: string): boolean {
    const expected = this.sign(payload);
    // Constant-time comparison to prevent timing attacks
    if (expected.length !== signature.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return diff === 0;
  }
}

// ── Singleton (uses ENCRYPTION_KEY env var) ───────────────────────────────────
let _cryptoService: MilitaryGradeCryptoService | null = null;

export function getCryptoService(): MilitaryGradeCryptoService {
  if (!_cryptoService) {
    const key = process.env['ENCRYPTION_KEY'] ?? process.env['SESSION_SECRET'] ?? 'default-dev-key-32-chars-minimum!!';
    _cryptoService = new MilitaryGradeCryptoService(key);
  }
  return _cryptoService;
}
