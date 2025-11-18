import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { STATES } from 'mongoose';
import type { LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class MongoConnectionLoggerService implements OnModuleInit {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  onModuleInit() {
    const emit = (
      level: 'info' | 'warn' | 'error',
      payload: Record<string, unknown>,
    ) => {
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
    };

    // Initial state
    if (this.conn.readyState === STATES.connected)
      emit('info', { event: 'mongo_connected' });

    this.conn.on('connected', () => emit('info', { event: 'mongo_connected' }));
    this.conn.on('reconnected', () =>
      emit('warn', { event: 'mongo_reconnected' }),
    );
    this.conn.on('disconnected', () =>
      emit('warn', { event: 'mongo_disconnected' }),
    );
    this.conn.on('error', (err) =>
      emit('error', { event: 'mongo_error', message: toMessage(err) }),
    );

    function toMessage(err: unknown): string {
      try {
        if (err instanceof Error) return `${err.name}: ${err.message}`;
        return JSON.stringify(err);
      } catch {
        return String(err);
      }
    }
  }
}
