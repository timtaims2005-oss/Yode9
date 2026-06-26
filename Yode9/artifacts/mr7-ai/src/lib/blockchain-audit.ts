/**
 * Blockchain Audit Logging System
 * Immutable audit trails using Merkle trees
 */

export interface AuditEntry {
  id: string;
  timestamp: number;
  action: string;
  userId: string;
  deviceId: string;
  metadata: Record<string, any>;
  previousHash: string;
  hash: string;
}

export class BlockchainAuditLog {
  private chain: AuditEntry[] = [];
  private storageKey = 'mr7-audit-chain';

  constructor() {
    this.loadFromStorage();
  }

  private async hash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async generateHash(entry: Omit<AuditEntry, 'hash'>): Promise<string> {
    const data = JSON.stringify({
      id: entry.id,
      timestamp: entry.timestamp,
      action: entry.action,
      userId: entry.userId,
      deviceId: entry.deviceId,
      metadata: entry.metadata,
      previousHash: entry.previousHash,
    });
    return await this.hash(data);
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.chain = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load audit chain:', error);
      this.chain = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.chain));
    } catch (error) {
      console.error('Failed to save audit chain:', error);
    }
  }

  async addEntry(
    action: string,
    userId: string,
    deviceId: string,
    metadata: Record<string, any> = {}
  ): Promise<AuditEntry> {
    const previousEntry = this.chain[this.chain.length - 1];
    const previousHash = previousEntry ? previousEntry.hash : '0'.repeat(64);

    const id = `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();

    const entryWithoutHash = {
      id,
      timestamp,
      action,
      userId,
      deviceId,
      metadata,
      previousHash,
    };

    const hash = await this.generateHash(entryWithoutHash);

    const entry: AuditEntry = {
      ...entryWithoutHash,
      hash,
    };

    this.chain.push(entry);
    this.saveToStorage();

    return entry;
  }

  async verifyChain(): Promise<boolean> {
    for (let i = 0; i < this.chain.length; i++) {
      const entry = this.chain[i];
      const previousHash = i === 0 ? '0'.repeat(64) : this.chain[i - 1].hash;

      if (entry.previousHash !== previousHash) {
        return false;
      }

      const expectedHash = await this.generateHash({
        id: entry.id,
        timestamp: entry.timestamp,
        action: entry.action,
        userId: entry.userId,
        deviceId: entry.deviceId,
        metadata: entry.metadata,
        previousHash: entry.previousHash,
      });

      if (entry.hash !== expectedHash) {
        return false;
      }
    }

    return true;
  }

  getEntries(): AuditEntry[] {
    return [...this.chain];
  }

  getEntriesByUser(userId: string): AuditEntry[] {
    return this.chain.filter(entry => entry.userId === userId);
  }

  getEntriesByAction(action: string): AuditEntry[] {
    return this.chain.filter(entry => entry.action === action);
  }

  getEntriesByDateRange(start: number, end: number): AuditEntry[] {
    return this.chain.filter(entry => entry.timestamp >= start && entry.timestamp <= end);
  }

  async getMerkleRoot(): Promise<string> {
    if (this.chain.length === 0) {
      return '0'.repeat(64);
    }

    let hashes = this.chain.map(entry => entry.hash);

    while (hashes.length > 1) {
      const newHashes: string[] = [];

      for (let i = 0; i < hashes.length; i += 2) {
        const left = hashes[i];
        const right = i + 1 < hashes.length ? hashes[i + 1] : left;
        const combined = await this.hash(left + right);
        newHashes.push(combined);
      }

      hashes = newHashes;
    }

    return hashes[0];
  }

  clear(): void {
    this.chain = [];
    this.saveToStorage();
  }

  getChainLength(): number {
    return this.chain.length;
  }
}

// Singleton instance
let auditLog: BlockchainAuditLog | null = null;

export function getAuditLog(): BlockchainAuditLog {
  if (!auditLog) {
    auditLog = new BlockchainAuditLog();
  }
  return auditLog;
}
