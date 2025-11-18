import { Injectable, Inject } from '@nestjs/common';
import type { RedisClientType } from 'redis';
import { RedisService } from './redis.service';
import { randomBytes } from 'crypto';
import type { LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class RedisLockService {
  private client: RedisClientType;

  constructor(
    private readonly redisService: RedisService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {
    this.client = this.redisService.getClient();
  }

  private genToken(): string {
    return randomBytes(16).toString('hex');
  }

  async acquire(key: string, ttlMs: number): Promise<string | null> {
    const token = this.genToken();
    const res = await this.client.set(key, token, { NX: true, PX: ttlMs });
    return res === 'OK' ? token : null;
  }

  async release(key: string, token: string): Promise<boolean> {
    const script =
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
    const result = await this.client.eval(script, {
      keys: [key],
      arguments: [token],
    });
    return (result as number) === 1;
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
