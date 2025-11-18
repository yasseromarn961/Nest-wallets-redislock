import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import type { LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class RedisService implements OnModuleInit {
  private client: RedisClientType;

  constructor(
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {
    const url = this.configService.get<string>('redisUrl');
    this.client = createClient({ url });
    this.client.on('error', (err) => {
      this.logBoth('error', {
        event: 'redis_error',
        message: this.toMessage(err),
      });
    });
    this.client.on('connect', () => {
      this.logBoth('info', { event: 'redis_connecting' });
    });
    this.client.on('ready', () => {
      this.logBoth('info', { event: 'redis_ready' });
    });
    this.client.on('end', () => {
      this.logBoth('warn', { event: 'redis_end' });
    });
    const anyClient = this.client as unknown as {
      on?: (event: string, listener: (...args: unknown[]) => void) => void;
    };
    anyClient.on?.('reconnecting', () => {
      this.logBoth('warn', { event: 'redis_reconnecting' });
    });
  }

  async onModuleInit() {
    if (!this.client.isOpen) {
      try {
        await this.client.connect();
        this.logBoth('info', { event: 'redis_connected' });
      } catch (err) {
        this.logBoth('error', {
          event: 'redis_connect_failed',
          message: this.toMessage(err),
        });
      }
    }
  }

  getClient(): RedisClientType {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(
    key: string,
    value: string,
    opts?: { px?: number; nx?: boolean; xx?: boolean },
  ): Promise<string | null> {
    const args: Record<string, unknown> = {};
    if (opts?.px != null) args['PX'] = opts.px;
    if (opts?.nx) args['NX'] = true;
    if (opts?.xx) args['XX'] = true;
    return this.client.set(key, value, args as any);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async eval(script: string, keys: string[], args: string[]): Promise<unknown> {
    return this.client.eval(script, { keys, arguments: args });
  }

  private toMessage(err: unknown): string {
    try {
      if (err instanceof Error) return `${err.name}: ${err.message}`;
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }

  private logBoth(
    level: 'info' | 'warn' | 'error',
    payload: Record<string, unknown>,
  ) {
    const text = (() => {
      try {
        return JSON.stringify(payload);
      } catch {
        return '[unserializable payload]';
      }
    })();
    console.log(text);
    const ext = this.logger as unknown as {
      info?: (message: unknown) => void;
      warn?: (message: unknown) => void;
      error?: (message: unknown) => void;
      log?: (message: unknown) => void;
    };
    const fn = ext[level] ?? (level === 'info' ? ext.log : undefined);
    if (typeof fn === 'function') fn.call(this.logger, payload);
  }
}
