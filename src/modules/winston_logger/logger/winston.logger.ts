import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { ConfigService } from '@nestjs/config';
import { MongoBatchTransport } from './transports/mongo-batch.transport';
import type Transport from 'winston-transport';
// Optional built-in transport
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { MongoDB } from 'winston-mongodb';

export function createWinstonOptions(
  configService: ConfigService,
): WinstonModuleOptions {
  const nodeEnv = configService.get<string>('nodeEnv') || 'development';
  const isDev = nodeEnv === 'development';
  const logLevel =
    configService.get<string>('logger.level') || (isDev ? 'debug' : 'info');
  const serviceName =
    configService.get<string>('logger.serviceName') || 'Nest RedisLock-backend';
  const logDir = configService.get<string>('logger.dir') || 'logs';
  const fileEnabled =
    (configService.get('logger.fileEnabled') as boolean) ?? true;
  type LevelToggles = {
    infoEnabled?: boolean;
    warnEnabled?: boolean;
    errorEnabled?: boolean;
    debugEnabled?: boolean;
  };
  const toggles: LevelToggles = configService.get<LevelToggles>(
    'logger.levelToggles',
  ) || {
    infoEnabled: true,
    warnEnabled: true,
    errorEnabled: true,
    debugEnabled: isDev,
  };

  const levelToggleFmt = levelToggleFormat(toggles);

  const consoleFormat = isDev
    ? winston.format.combine(
        levelToggleFmt,
        redactFormat(),
        nestWinstonModuleUtilities.format.nestLike(serviceName, {
          colors: true,
          prettyPrint: true,
        }),
      )
    : winston.format.combine(
        levelToggleFmt,
        redactFormat(),
        winston.format.timestamp(),
        winston.format.json(),
      );

  const fileJsonFormat = winston.format.combine(
    levelToggleFmt,
    redactFormat(),
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  );

  const transports: Transport[] = [];

  // Console transport (kept enabled)
  transports.push(
    new winston.transports.Console({
      level: logLevel,
      format: consoleFormat,
      handleExceptions: true,
    }),
  );

  // File transports are optional and can be disabled
  if (fileEnabled) {
    transports.push(
      new DailyRotateFile({
        level: 'info',
        dirname: logDir,
        filename: '%DATE%-app.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        format: fileJsonFormat,
      }) as unknown as Transport,
    );
    transports.push(
      new DailyRotateFile({
        level: 'error',
        dirname: logDir,
        filename: '%DATE%-error.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
        format: fileJsonFormat,
      }) as unknown as Transport,
    );
  }

  // Optional: MongoDB logging transport
  interface LoggerMongoConfig {
    enabled?: boolean;
    uri?: string;
    collection?: string;
    ttlDays?: number;
    batchSize?: number;
    flushIntervalMs?: number;
    useBuiltInTransport?: boolean;
  }
  const mongo = configService.get<LoggerMongoConfig>('logger.mongo') || {};
  const mongoEnabled =
    mongo?.enabled === true || (!!mongo?.uri && mongo?.enabled !== false);
  if (mongoEnabled && mongo?.uri) {
    if (mongo.useBuiltInTransport) {
      type MongoDBTransportOptions = {
        db: string;
        options?: Record<string, unknown>;
        collection?: string;
        level?: string;
        tryReconnect?: boolean;
        decolorize?: boolean;
      };
      const MongoDBCtor = MongoDB as unknown as new (
        opts: MongoDBTransportOptions,
      ) => Transport;
      transports.push(
        new MongoDBCtor({
          db: mongo.uri,
          options: { useUnifiedTopology: true },
          collection: mongo.collection,
          level: logLevel,
          tryReconnect: true,
          decolorize: true,
          // winston-mongodb creates default indexes; TTL handled by LogsModule
        }),
      );
    } else {
      transports.push(
        new MongoBatchTransport({
          uri: mongo.uri,
          collection: mongo.collection ?? 'winston_logs',
          ttlDays: mongo.ttlDays ?? 14,
          batchSize: mongo.batchSize ?? 50,
          flushIntervalMs: mongo.flushIntervalMs ?? 2000,
          levelToggles: toggles,
        }),
      );
    }
  }

  const options: WinstonModuleOptions = {
    level: logLevel,
    // Apply global formatting to ALL transports so level toggles and redaction
    // affect console, file, and Mongo transports uniformly.
    format: winston.format.combine(levelToggleFmt, redactFormat()),
    defaultMeta: {
      service: serviceName,
      env: nodeEnv,
    },
    transports,
  } as WinstonModuleOptions;

  // Exception handlers: disable file-based handlers if file logging is disabled
  if (fileEnabled) {
    options.exceptionHandlers = [
      new DailyRotateFile({
        dirname: logDir,
        filename: '%DATE%-exceptions.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
        format: fileJsonFormat,
      }) as unknown as Transport,
    ];
  }

  return options;
}

function redactFormat() {
  return winston.format((info) => {
    const sensitiveKeys = [
      'authorization',
      'password',
      'accessToken',
      'refreshToken',
      'token',
      'jwt',
      'secret',
      'set-cookie',
      'cookie',
    ];
    for (const key of sensitiveKeys) {
      if (key in info) info[key] = '[REDACTED]';
    }
    if (typeof info.message === 'string') {
      info.message = info.message
        .replace(/(Bearer\s+)[A-Za-z0-9-_.]+/gi, '$1[REDACTED]')
        .replace(/(password=)[^&\s]+/gi, '$1[REDACTED]')
        .replace(/(accessToken=)[^&\s]+/gi, '$1[REDACTED]')
        .replace(/(refreshToken=)[^&\s]+/gi, '$1[REDACTED]')
        .replace(/(token=)[^&\s]+/gi, '$1[REDACTED]');
    }
    return info;
  })();
}

function levelToggleFormat(toggles: {
  infoEnabled?: boolean;
  warnEnabled?: boolean;
  errorEnabled?: boolean;
  debugEnabled?: boolean;
}) {
  const defaults = {
    infoEnabled: true,
    warnEnabled: true,
    errorEnabled: true,
    debugEnabled: false,
  };
  const cfg = { ...defaults, ...(toggles || {}) };
  return winston.format((info) => {
    const lvl = (info.level || '').toLowerCase();
    const allow =
      lvl === 'info'
        ? cfg.infoEnabled
        : lvl === 'warn'
          ? cfg.warnEnabled
          : lvl === 'error'
            ? cfg.errorEnabled
            : lvl === 'debug'
              ? cfg.debugEnabled
              : true;
    return allow ? info : false;
  })();
}
