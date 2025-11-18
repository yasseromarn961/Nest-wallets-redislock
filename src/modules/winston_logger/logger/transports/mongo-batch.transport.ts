import Transport from 'winston-transport';
import { MongoClient, Collection } from 'mongodb';

export interface MongoBatchTransportOptions {
  uri: string;
  collection: string;
  ttlDays: number; // retention policy in days
  batchSize?: number; // number of logs per bulk insert
  flushIntervalMs?: number; // periodic flush interval
  levelToggles?: {
    infoEnabled?: boolean;
    warnEnabled?: boolean;
    errorEnabled?: boolean;
    debugEnabled?: boolean;
  };
}

type LogDoc = Record<string, unknown> & {
  timestamp: Date;
  createdAt?: Date;
  level: string;
  message?: string;
  requestId?: string;
  batchId?: string;
  flushReason?: string;
  error?: unknown;
};

export class MongoBatchTransport extends Transport {
  private client?: MongoClient;
  private collection?: Collection<LogDoc>;
  private buffer: LogDoc[] = [];
  private readonly batchSize: number;
  private readonly flushIntervalMs: number;
  private flushTimer?: NodeJS.Timeout;
  private scheduledReason: 'timeout' | undefined;
  private batchSeq = 0;
  private readonly ttlDays: number;
  private readonly toggles: {
    infoEnabled: boolean;
    warnEnabled: boolean;
    errorEnabled: boolean;
    debugEnabled: boolean;
  };

  constructor(opts: MongoBatchTransportOptions) {
    super({ level: 'info', handleExceptions: true });
    this.batchSize = Math.max(1, opts.batchSize ?? 50);
    this.flushIntervalMs = Math.max(500, opts.flushIntervalMs ?? 2000);
    this.ttlDays = Math.max(1, opts.ttlDays);
    this.toggles = {
      infoEnabled: opts.levelToggles?.infoEnabled ?? true,
      warnEnabled: opts.levelToggles?.warnEnabled ?? true,
      errorEnabled: opts.levelToggles?.errorEnabled ?? true,
      debugEnabled: opts.levelToggles?.debugEnabled ?? false,
    };
    this.init(opts).catch((err) => {
      console.error('MongoBatchTransport init failed:', err);
    });
  }

  private async init(opts: MongoBatchTransportOptions) {
    this.client = await MongoClient.connect(opts.uri, {
      // modern unified topology is default in newer drivers
    });
    const db = this.client.db();
    this.collection = db.collection<LogDoc>(opts.collection);
    await this.ensureIndexes(this.collection);
    this.startFlushTimer();
  }

  private async ensureIndexes(col: Collection<LogDoc>) {
    const expireAfterSeconds = this.ttlDays * 24 * 60 * 60;
    // TTL on timestamp
    await col.createIndex(
      { timestamp: 1 },
      { expireAfterSeconds, background: true },
    );
    // Helpful indexes
    await col.createIndex({ level: 1, timestamp: -1 }, { background: true });
    await col.createIndex(
      { requestId: 1, timestamp: -1 },
      { background: true },
    );
    await col.createIndex({ event: 1, timestamp: -1 }, { background: true });
  }

  private startFlushTimer() {
    // Do NOT run a periodic flush. We only schedule a one-shot flush
    // when there are pending logs and batchSize has not been reached.
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }
    this.scheduledReason = undefined;
  }

  private sanitizeInfo(info: Record<string, unknown>): LogDoc {
    const timestamp = (() => {
      const t = info.timestamp;
      if (typeof t === 'string' || typeof t === 'number') return new Date(t);
      if (t instanceof Date) return t;
      return new Date();
    })();
    const level = typeof info['level'] === 'string' ? info['level'] : 'info';
    const message =
      typeof info.message === 'string'
        ? this.redactString(info.message)
        : undefined;
    // Clone and redact sensitive keys
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(info)) {
      if (key === 'level' || key === 'timestamp' || key === 'message') continue;
      if (this.isSensitiveKey(key)) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        redacted[key] = this.redactString(value);
      } else if (value && typeof value === 'object') {
        redacted[key] = this.redactObject(value);
      } else {
        redacted[key] = value;
      }
    }

    const doc: LogDoc = {
      timestamp,
      createdAt: timestamp,
      level,
      message,
      ...redacted,
    };

    // Promote requestId if nested
    const reqIdInfo =
      typeof info['requestId'] === 'string' ? info['requestId'] : undefined;
    const reqIdAlt =
      typeof info['reqId'] === 'string' ? info['reqId'] : undefined;
    const reqIdRedacted =
      typeof redacted.requestId === 'string' ? redacted.requestId : undefined;
    doc.requestId = reqIdInfo ?? reqIdAlt ?? reqIdRedacted;

    // Normalize error object
    if (redacted.error) {
      doc.error = this.normalizeError(redacted.error);
    }

    return doc;
  }

  private isSensitiveKey(key: string): boolean {
    const lower = key.toLowerCase();
    return (
      lower.includes('password') ||
      lower === 'authorization' ||
      lower.includes('token') ||
      lower.includes('jwt') ||
      lower.includes('secret') ||
      lower.includes('set-cookie') ||
      lower.includes('cookie')
    );
  }

  private redactObject(obj: unknown): unknown {
    if (obj == null) return obj;
    if (Array.isArray(obj)) return obj.map((v) => this.redactObject(v));
    if (obj instanceof Error) return this.normalizeError(obj);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (this.isSensitiveKey(k)) {
        out[k] = '[REDACTED]';
      } else if (typeof v === 'string') {
        out[k] = this.redactString(v);
      } else if (v && typeof v === 'object') {
        out[k] = this.redactObject(v);
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  private redactString(s: string): string {
    // Basic redactions for tokens and passwords embedded in strings
    return s
      .replace(/(Bearer\s+)[A-Za-z0-9-_.]+/gi, '$1[REDACTED]')
      .replace(/(password=)[^&\s]+/gi, '$1[REDACTED]')
      .replace(/(accessToken=)[^&\s]+/gi, '$1[REDACTED]')
      .replace(/(refreshToken=)[^&\s]+/gi, '$1[REDACTED]')
      .replace(/(token=)[^&\s]+/gi, '$1[REDACTED]');
  }

  private normalizeError(err: unknown) {
    if (!err) return undefined;
    if (typeof err === 'string') return { message: this.redactString(err) };
    if (err instanceof Error) {
      return { name: err.name, message: this.redactString(err.message) };
    }
    try {
      const obj = JSON.parse(JSON.stringify(err)) as unknown;
      return this.redactObject(obj);
    } catch {
      return { message: this.redactString(this.toStringSafe(err)) };
    }
  }

  private toStringSafe(input: unknown): string {
    if (typeof input === 'string') return input;
    if (
      typeof input === 'number' ||
      typeof input === 'boolean' ||
      typeof input === 'bigint' ||
      typeof input === 'symbol'
    ) {
      return String(input);
    }
    try {
      if (input instanceof Error) return input.message;
      if (input && typeof input === 'object') {
        return Object.prototype.toString.call(input);
      }
      return String(input);
    } catch {
      return '[unserializable]';
    }
  }

  private shouldWrite(level: string): boolean {
    const lvl = (level || 'info').toLowerCase();
    if (lvl === 'info') return this.toggles.infoEnabled;
    if (lvl === 'warn') return this.toggles.warnEnabled;
    if (lvl === 'error') return this.toggles.errorEnabled;
    if (lvl === 'debug') return this.toggles.debugEnabled;
    return true; // other levels
  }

  log(info: Record<string, unknown>, callback: () => void) {
    setImmediate(callback);
    // Level gating to enforce environment toggles even if upstream formats are bypassed
    const rawLevel = typeof info['level'] === 'string' ? info['level'] : 'info';
    const level = rawLevel.toLowerCase();
    if (!this.shouldWrite(level)) {
      return;
    }
    const doc = this.sanitizeInfo(info);
    this.buffer.push(doc);

    // Flush when buffer reaches batchSize; otherwise schedule a one-shot flush
    // after flushIntervalMs if not already scheduled.
    if (this.buffer.length >= this.batchSize) {
      // Cancel any scheduled flush and write immediately as a batch
      if (this.flushTimer) {
        clearTimeout(this.flushTimer);
        this.flushTimer = undefined;
      }
      this.scheduledReason = undefined;
      void this.flush('size');
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flushTimer = undefined;
        void this.flush('timeout');
      }, this.flushIntervalMs);
      // Avoid keeping the event loop alive just for the timer
      const t = this.flushTimer;
      if (t && typeof t.unref === 'function') {
        t.unref();
      }
      this.scheduledReason = 'timeout';
    }
  }

  private async flush(reason?: 'size' | 'timeout' | 'close') {
    if (!this.collection || this.buffer.length === 0) return;
    const docs = this.buffer.splice(0, this.buffer.length);
    const batchId = `${Date.now()}_${this.batchSeq++}`;
    for (const d of docs) {
      d.batchId = batchId;
      d.flushReason = reason ?? this.scheduledReason ?? 'unknown';
    }
    try {
      await this.collection.insertMany(docs, { ordered: false });
    } catch (err) {
      console.error('MongoBatchTransport flush error:', err);
    }
    this.scheduledReason = undefined;
  }

  close(): void {
    void this.flush('close');
    if (this.flushTimer) clearTimeout(this.flushTimer);
    void this.client?.close();
  }
}
