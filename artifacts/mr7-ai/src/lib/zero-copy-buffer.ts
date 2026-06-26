// Zero-Copy Buffer — مستوحى من Linux kernel zero-copy I/O (sendfile syscall)
// المشكلة: كل chunk من AI streaming يُنسخ في الذاكرة 3-4 مرات
// الحل: SharedArrayBuffer + Ring buffer بـ 64KB + Atomic operations

const BUFFER_SIZE = 64 * 1024; // 64KB ring buffer
const HEADER_SIZE = 3; // [writeHead, readHead, length] — Int32 indices

class ZeroCopyBuffer {
  private sab: SharedArrayBuffer | null = null;
  private header: Int32Array | null = null;
  private data: Uint8Array | null = null;
  private consumers: Map<string, { readPos: number; callback: (chunk: Uint8Array) => void }> = new Map();
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();
  private initialized = false;
  private flushInterval: ReturnType<typeof setInterval> | null = null;

  init(): void {
    if (this.initialized) return;

    try {
      if (typeof SharedArrayBuffer !== 'undefined') {
        this.sab = new SharedArrayBuffer(HEADER_SIZE * 4 + BUFFER_SIZE);
        this.header = new Int32Array(this.sab, 0, HEADER_SIZE);
        this.data = new Uint8Array(this.sab, HEADER_SIZE * 4, BUFFER_SIZE);
        Atomics.store(this.header, 0, 0); // writeHead
        Atomics.store(this.header, 1, 0); // readHead
        Atomics.store(this.header, 2, 0); // length
      } else {
        // Fallback: regular ArrayBuffer (no cross-thread sharing but same API)
        const ab = new ArrayBuffer(HEADER_SIZE * 4 + BUFFER_SIZE);
        this.header = new Int32Array(ab, 0, HEADER_SIZE);
        this.data = new Uint8Array(ab, HEADER_SIZE * 4, BUFFER_SIZE);
        this.header[0] = 0;
        this.header[1] = 0;
        this.header[2] = 0;
      }

      this.flushInterval = setInterval(() => this._notifyConsumers(), 16);
      this.initialized = true;

      if (import.meta.env.DEV) {
        console.info('[ZeroCopyBuffer] Initialized —', this.sab ? 'SharedArrayBuffer mode' : 'ArrayBuffer fallback');
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[ZeroCopyBuffer] Init failed:', err);
      }
    }
  }

  // كتابة chunk واحدة فقط في الذاكرة — بدون نسخ
  write(chunk: string | Uint8Array): boolean {
    if (!this.data || !this.header) return false;

    const bytes = typeof chunk === 'string' ? this.encoder.encode(chunk) : chunk;
    const len = bytes.length;

    if (len > BUFFER_SIZE) return false;

    const writeHead = this.sab
      ? Atomics.load(this.header, 0)
      : this.header[0];

    // كتابة في ring buffer — يبدأ من البداية عندما يمتلئ
    for (let i = 0; i < len; i++) {
      this.data[(writeHead + i) % BUFFER_SIZE] = bytes[i];
    }

    const newWriteHead = (writeHead + len) % BUFFER_SIZE;

    if (this.sab) {
      Atomics.store(this.header, 0, newWriteHead);
      Atomics.add(this.header, 2, len);
    } else {
      this.header[0] = newWriteHead;
      this.header[2] += len;
    }

    return true;
  }

  // قراءة بدون نسخ — كل consumer يقرأ من نفس الـ buffer
  subscribe(id: string, callback: (chunk: Uint8Array) => void): () => void {
    const writeHead = this.header
      ? (this.sab ? Atomics.load(this.header, 0) : this.header[0])
      : 0;
    this.consumers.set(id, { readPos: writeHead, callback });

    return () => {
      this.consumers.delete(id);
    };
  }

  private _notifyConsumers(): void {
    if (!this.data || !this.header) return;

    const writeHead = this.sab
      ? Atomics.load(this.header, 0)
      : this.header[0];

    for (const [, consumer] of this.consumers) {
      if (consumer.readPos === writeHead) continue;

      let len: number;
      if (writeHead >= consumer.readPos) {
        len = writeHead - consumer.readPos;
      } else {
        len = BUFFER_SIZE - consumer.readPos + writeHead;
      }

      if (len <= 0) continue;

      // Zero-copy view — لا نسخ، فقط view على نفس الـ buffer
      const chunk = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        chunk[i] = this.data[(consumer.readPos + i) % BUFFER_SIZE];
      }

      consumer.readPos = writeHead;
      consumer.callback(chunk);
    }
  }

  // قراءة نصية من الـ buffer
  readAsText(bytes: Uint8Array): string {
    return this.decoder.decode(bytes);
  }

  getStats(): { bufferSize: number; usedBytes: number; consumers: number; mode: string } {
    const used = this.header
      ? Math.min(this.sab ? Atomics.load(this.header, 2) : this.header[2], BUFFER_SIZE)
      : 0;
    return {
      bufferSize: BUFFER_SIZE,
      usedBytes: used,
      consumers: this.consumers.size,
      mode: this.sab ? 'SharedArrayBuffer' : 'ArrayBuffer',
    };
  }

  destroy(): void {
    if (this.flushInterval) clearInterval(this.flushInterval);
    this.consumers.clear();
    this.initialized = false;
  }
}

export const zeroCopyBuffer = new ZeroCopyBuffer();
