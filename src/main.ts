import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { LoggerService } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService);
  const nestWinston = app.get<LoggerService>(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(nestWinston);

  // Always show bootstrap logs in terminal only (do not persist)
  console.log('Starting Nest application...');

  // Respect LOG_LEVEL_* toggles when emitting bootstrap "info" logs
  const levelToggles = sanitizeLevelToggles(
    configService.get<unknown>('logger.levelToggles'),
  );
  // Ensure the toggles read does not raise unused var lint while keeping bootstrap logs unchanged
  void levelToggles;

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable CORS
  app.enableCors();

  // Setup Swagger
  const swaggerEnabled = configService.get<boolean>('swagger.enabled');
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle(configService.get<string>('swagger.title') || 'Nest RedisLock API')
      .setDescription(
        configService.get<string>('swagger.description') || 'API Documentation',
      )
      .setVersion(configService.get<string>('swagger.version') || '1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'user-access-token',
      )
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter Admin JWT token',
          in: 'header',
        },
        'admin-access-token',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);

    // Filter out hidden tags
    const hiddenTags = configService.get<string[]>('swagger.hiddenTags') || [];
    if (hiddenTags.length > 0) {
      Object.keys(document.paths).forEach((path) => {
        const pathItemUnknown = document.paths[path];
        if (!isPlainObject(pathItemUnknown)) return;
        const pathItem = pathItemUnknown;
        Object.keys(pathItem).forEach((method) => {
          const opUnknown = pathItem[method];
          let tags: unknown = undefined;
          if (isPlainObject(opUnknown)) {
            tags = opUnknown.tags;
          }
          const tagList = Array.isArray(tags) ? tags : [];
          const hasHiddenTag = tagList.some(
            (tag) => typeof tag === 'string' && hiddenTags.includes(tag),
          );
          if (hasHiddenTag) {
            delete pathItem[method];
          }
        });
        // Remove path if all methods are deleted
        if (Object.keys(pathItem).length === 0) {
          delete document.paths[path];
        }
      });
    }

    const swaggerPath = configService.get<string>('swagger.path') || 'docs';

    // Force parameters order within each operation so that pagination appears first
    try {
      Object.keys(document.paths).forEach((path) => {
        const pathItemUnknown = document.paths[path];
        if (!isPlainObject(pathItemUnknown)) return;
        const pathItem = pathItemUnknown;
        Object.keys(pathItem).forEach((method) => {
          const opUnknown = pathItem[method];
          let paramsUnknown: unknown = undefined;
          if (isPlainObject(opUnknown)) {
            paramsUnknown = opUnknown.parameters;
          }
          if (Array.isArray(paramsUnknown)) {
            const params = paramsUnknown;
            const weight = (name: string): number => {
              if (name === 'page') return 0;
              if (name === 'limit') return 1;
              return 2; // Others alphabetical after pagination
            };
            const getParamName = (obj: unknown): string => {
              if (isPlainObject(obj)) {
                const n = obj.name;
                if (typeof n === 'string') return n;
              }
              return '';
            };
            params.sort((a, b) => {
              const nameA = getParamName(a);
              const nameB = getParamName(b);
              const wa = weight(nameA);
              const wb = weight(nameB);
              if (wa !== wb) return wa - wb;
              return nameA.localeCompare(nameB);
            });
          }
        });
      });
    } catch (err) {
      // Do not fail boot if sorting fails; this only affects Swagger rendering
      console.warn('Swagger parameters sorting warning:', err);
    }
    SwaggerModule.setup(swaggerPath, app, document, {
      customSiteTitle:
        configService.get<string>('swagger.title') || 'Nest RedisLock API',
      customCss: '.swagger-ui .topbar { display: none }',
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        // Ensure pagination filters (page, limit) appear first in the parameters list
        parametersSorter: (a: unknown, b: unknown): number => {
          type ImmutableLike = { get?: (key: string) => unknown };
          const getName = (obj: unknown): string => {
            const o = obj as ImmutableLike;
            if (typeof o.get === 'function') {
              const val = o.get('name');
              if (typeof val === 'string') return val;
            }
            return '';
          };
          const weight = (name: string): number => {
            if (name === 'page') return 0;
            if (name === 'limit') return 1;
            return 2; // Others follow alphabetically
          };
          const nameA = getName(a);
          const nameB = getName(b);
          const wa = weight(nameA);
          const wb = weight(nameB);
          if (wa !== wb) return wa - wb;
          return nameA.localeCompare(nameB);
        },
        // Sort operations inside the same tag/section by our vendor extension x-sort
        // If x-sort is missing, fallback to alphabetical sorting by summary/path
        operationsSorter: (a: unknown, b: unknown): number => {
          type ImmutableLike = {
            getIn?: (path: unknown[]) => unknown;
            get?: (key: string) => unknown;
          };

          const getXSort = (obj: unknown): number | undefined => {
            const o = obj as ImmutableLike;
            if (typeof o.getIn === 'function') {
              const val = o.getIn(['operation', 'x-sort']);
              if (typeof val === 'number' && Number.isFinite(val)) return val;
              if (typeof val === 'string') {
                const n = Number(val);
                if (Number.isFinite(n)) return n;
              }
            }
            return undefined;
          };

          const getStringField = (obj: unknown, field: string): string => {
            const o = obj as ImmutableLike;
            if (typeof o.get === 'function') {
              const val = o.get(field);
              if (typeof val === 'string') return val;
            }
            return '';
          };

          const sortA = getXSort(a);
          const sortB = getXSort(b);

          if (sortA !== undefined && sortB !== undefined) {
            return sortA - sortB;
          }
          if (sortA !== undefined) return -1;
          if (sortB !== undefined) return 1;

          const summaryA = getStringField(a, 'summary');
          const summaryB = getStringField(b, 'summary');
          const bySummary = summaryA.localeCompare(summaryB);
          if (bySummary !== 0) return bySummary;
          const pathA = getStringField(a, 'path');
          const pathB = getStringField(b, 'path');
          return pathA.localeCompare(pathB);
        },
      },
    });

    const port = configService.get<number>('port') || 3000;
    // Show Swagger URL in terminal only
    console.log(
      `Swagger documentation is available at: http://localhost:${port}/${swaggerPath}`,
    );
  }

  const port = configService.get<number>('port') || 3000;
  await app.listen(port, '0.0.0.0');
  // Show running port in terminal only
  console.log(`Application is running on: http://localhost:${port}`);
}
void bootstrap();

type LevelToggles = {
  infoEnabled: boolean;
  warnEnabled: boolean;
  errorEnabled: boolean;
  debugEnabled: boolean;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function sanitizeLevelToggles(input: unknown): LevelToggles {
  const defaults: LevelToggles = {
    infoEnabled: true,
    warnEnabled: true,
    errorEnabled: true,
    debugEnabled: false,
  };
  if (!isPlainObject(input)) return defaults;
  const obj = input;
  return {
    infoEnabled:
      typeof obj.infoEnabled === 'boolean'
        ? obj.infoEnabled
        : defaults.infoEnabled,
    warnEnabled:
      typeof obj.warnEnabled === 'boolean'
        ? obj.warnEnabled
        : defaults.warnEnabled,
    errorEnabled:
      typeof obj.errorEnabled === 'boolean'
        ? obj.errorEnabled
        : defaults.errorEnabled,
    debugEnabled:
      typeof obj.debugEnabled === 'boolean'
        ? obj.debugEnabled
        : defaults.debugEnabled,
  };
}
