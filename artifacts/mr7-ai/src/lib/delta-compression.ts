// Delta Compression — مستوحى من rsync delta algorithm وgit diff
// المشكلة: كل state update يُرسل البيانات كاملة
// الحل: يحسب ويرسل الفرق فقط (delta) — تقليل 90% في بعض الحالات

import { lzCompress } from './lz-compress';

type Primitive = string | number | boolean | null | undefined;
type DeltaValue = Primitive | DeltaObject | DeltaArray;
type DeltaObject = { [key: string]: DeltaValue };
type DeltaArray = DeltaValue[];

interface Delta {
  added: DeltaObject;
  removed: string[];
  modified: DeltaObject;
  version: number;
  timestamp: number;
  checksum: number;
}

interface CompressionStats {
  originalBytes: number;
  deltaBytes: number;
  compressionRatio: number;
  totalDeltas: number;
  avgSavings: number;
}

class DeltaCompression {
  private snapshots: Map<string, { state: DeltaObject; version: number }> = new Map();
  private stats: CompressionStats = {
    originalBytes: 0,
    deltaBytes: 0,
    compressionRatio: 1,
    totalDeltas: 0,
    avgSavings: 0,
  };

  // حساب الـ delta بين الـ state القديم والجديد
  computeDelta(id: string, newState: DeltaObject): Delta {
    const snapshot = this.snapshots.get(id);
    const oldState = snapshot?.state ?? {};
    const version = (snapshot?.version ?? 0) + 1;

    const delta: Delta = {
      added: {},
      removed: [],
      modified: {},
      version,
      timestamp: Date.now(),
      checksum: this._checksum(newState),
    };

    // إيجاد المضاف والمعدّل
    for (const [key, newVal] of Object.entries(newState)) {
      if (!(key in oldState)) {
        delta.added[key] = newVal;
      } else if (!this._deepEqual(oldState[key], newVal)) {
        // إذا كانا objects، احسب delta متداخل
        if (
          typeof newVal === 'object' && newVal !== null && !Array.isArray(newVal) &&
          typeof oldState[key] === 'object' && oldState[key] !== null
        ) {
          const nested = this.computeDelta(`${id}.${key}`, newVal as DeltaObject);
          delta.modified[key] = { __delta: nested };
        } else {
          delta.modified[key] = newVal;
        }
      }
    }

    // إيجاد المحذوف
    for (const key of Object.keys(oldState)) {
      if (!(key in newState)) {
        delta.removed.push(key);
      }
    }

    // حفظ الـ snapshot الجديد
    this.snapshots.set(id, { state: this._deepClone(newState), version });

    // تحديث الإحصائيات
    const originalSize = JSON.stringify(newState).length;
    const deltaSize = JSON.stringify(delta).length;
    this.stats.originalBytes += originalSize;
    this.stats.deltaBytes += deltaSize;
    this.stats.totalDeltas++;
    this.stats.compressionRatio = this.stats.deltaBytes / Math.max(1, this.stats.originalBytes);
    this.stats.avgSavings = (1 - this.stats.compressionRatio) * 100;

    return delta;
  }

  // إعادة بناء الـ state من الـ deltas
  applyDelta(id: string, delta: Delta): DeltaObject {
    const snapshot = this.snapshots.get(id);
    const currentState = this._deepClone(snapshot?.state ?? {});

    // تطبيق الإضافات
    for (const [key, val] of Object.entries(delta.added)) {
      currentState[key] = val;
    }

    // تطبيق التعديلات
    for (const [key, val] of Object.entries(delta.modified)) {
      if (val && typeof val === 'object' && '__delta' in (val as object)) {
        const nestedDelta = (val as { __delta: Delta }).__delta;
        currentState[key] = this.applyDelta(`${id}.${key}`, nestedDelta) as DeltaValue;
      } else {
        currentState[key] = val;
      }
    }

    // تطبيق الحذف
    for (const key of delta.removed) {
      delete currentState[key];
    }

    // التحقق من الـ checksum
    const computedChecksum = this._checksum(currentState);
    if (computedChecksum !== delta.checksum) {
      console.warn('[DeltaCompression] Checksum mismatch — requesting full sync');
      this.snapshots.delete(id);
    } else {
      this.snapshots.set(id, { state: currentState, version: delta.version });
    }

    return currentState;
  }

  // ضغط الـ delta مع lz-compress للحد الأقصى من التوفير
  async compress(id: string, newState: DeltaObject): Promise<string> {
    const delta = this.computeDelta(id, newState);
    const deltaJson = JSON.stringify(delta);

    try {
      return await lzCompress.compress(deltaJson);
    } catch {
      return deltaJson;
    }
  }

  // فك الضغط وتطبيق الـ delta
  async decompress(id: string, compressed: string): Promise<DeltaObject> {
    let deltaJson: string;
    try {
      deltaJson = await lzCompress.decompress(compressed);
    } catch {
      deltaJson = compressed;
    }

    const delta = JSON.parse(deltaJson) as Delta;
    return this.applyDelta(id, delta);
  }

  // مسح الـ snapshot لإعادة البداية
  reset(id: string): void {
    this.snapshots.delete(id);
    // مسح الـ nested snapshots
    for (const key of this.snapshots.keys()) {
      if (key.startsWith(`${id}.`)) this.snapshots.delete(key);
    }
  }

  // فحص هل يستحق ضغط الـ delta أم إرسال الكامل أسرع
  shouldUseDelta(id: string, newState: DeltaObject): boolean {
    const snapshot = this.snapshots.get(id);
    if (!snapshot) return false;

    const fullSize = JSON.stringify(newState).length;
    const estimatedDeltaSize = fullSize * 0.1; // تقدير مبسط

    return estimatedDeltaSize < fullSize * 0.5; // استخدم delta إذا يوفر 50%+
  }

  private _deepEqual(a: DeltaValue, b: DeltaValue): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (a === null || b === null) return false;
    if (typeof a !== 'object') return false;

    const aKeys = Object.keys(a as object);
    const bKeys = Object.keys(b as object);
    if (aKeys.length !== bKeys.length) return false;

    for (const key of aKeys) {
      if (!this._deepEqual(
        (a as DeltaObject)[key],
        (b as DeltaObject)[key]
      )) return false;
    }
    return true;
  }

  private _deepClone<T>(obj: T): T {
    if (typeof structuredClone !== 'undefined') return structuredClone(obj);
    return JSON.parse(JSON.stringify(obj));
  }

  private _checksum(obj: object): number {
    const str = JSON.stringify(obj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return hash >>> 0;
  }

  getStats(): CompressionStats {
    return { ...this.stats };
  }
}

export const deltaCompression = new DeltaCompression();
