export interface AppConfiguration {
  // Environment
  nodeEnv: string;
  port: number;

  // Database
  mongoUrl: string;
  redisUrl: string;

  // JWT & Auth
  jwt: {
    secret: string;
    accessTokenExpiration: number;
    refreshTokenExpiration: number;
  };

  auth: {
    saltRounds: number;
    resetPasswordExpiration: number;
    emailVerificationExpiration: number;
  };

  // Admin Auth Service (External)
  adminAuthServiceUrl: string;

  // Email Configuration
  email: {
    senderEmail: string;
    senderName: string;
    apiKey: string;
  };

  // Frontend URLs
  frontendUrl: string;
  forgotPasswordFrontendUrl: string;

  // Swagger Configuration
  swagger: {
    enabled: boolean;
    title: string;
    description: string;
    version: string;
    path: string;
    hiddenTags: string[];
  };

  // AWS Configuration
  aws: {
    accessKeyId: string;
    region: string;
    role: string;
    secretAccessKey: string;
    mediaFilesS3Bucket: string;
  };

  // S3 Configuration
  s3: {
    bucketName: string;
    region: string;
  };

  // PayTabs Configuration
  paytabs: {
    profileId: string;
    serverKey: string;
    region: string;
    callbackUrl: string;
  };

  // Logger Configuration
  logger: {
    level: string;
    dir: string;
    serviceName: string;
    fileEnabled: boolean;
    levelToggles: {
      infoEnabled: boolean;
      warnEnabled: boolean;
      errorEnabled: boolean;
      debugEnabled: boolean;
    };
    mongo: {
      enabled: boolean;
      uri: string;
      collection: string;
      ttlDays: number;
      batchSize: number;
      flushIntervalMs: number;
      useBuiltInTransport: boolean;
    };
  };
}

export default (): AppConfiguration => ({
  // Environment
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),

  // Database
  mongoUrl: process.env.MONGO_URL || '',
  redisUrl: process.env.REDIS_URL || '',

  // JWT & Auth
  jwt: {
    secret: process.env.JWT_SECRET || '',
    accessTokenExpiration: parseInt(
      process.env.JWT_ACCESS_TOKEN_EXPIRATION || '3600',
      10,
    ),
    refreshTokenExpiration: parseInt(
      process.env.JWT_REFRESH_TOKEN_EXPIRATION || '2592000',
      10,
    ),
  },

  auth: {
    saltRounds: parseInt(process.env.AUTH_SALT_ROUNDS || '10', 10),
    resetPasswordExpiration: parseInt(
      process.env.RESET_PASSWORD_EXPIRATION || '300',
      10,
    ),
    emailVerificationExpiration: parseInt(
      process.env.EMAIL_VERIFICATION_EXPIRATION || '1800',
      10,
    ),
  },

  // Admin Auth Service (External)
  adminAuthServiceUrl: process.env.ADMIN_AUTH_SERVICE_URL || '',

  // Email Configuration
  email: {
    senderEmail: process.env.MAILERSEND_SENDER_EMAIL || '',
    senderName: process.env.MAILERSEND_SENDER_NAME || '',
    apiKey: process.env.MAILERSEND_API_KEY || '',
  },

  // Frontend URLs
  frontendUrl: process.env.FRONTEND_URL || '',
  forgotPasswordFrontendUrl: process.env.FORGOT_PASSWORD_FRONEND_URL || '',

  // Swagger Configuration
  swagger: {
    enabled: process.env.SWAGGER_ENABLED !== 'false',
    title: process.env.SWAGGER_TITLE || 'Nest RedisLock API',
    description:
      process.env.SWAGGER_DESCRIPTION || 'Nest RedisLock Backend API Documentation',
    version: process.env.SWAGGER_VERSION || '1.0',
    path: process.env.SWAGGER_PATH || 'docs',
    hiddenTags: process.env.SWAGGER_HIDDEN_TAGS
      ? process.env.SWAGGER_HIDDEN_TAGS.split(',').map((tag) => tag.trim())
      : [],
  },

  // AWS Configuration
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    region: process.env.AWS_REGION || 'us-east-1',
    role: process.env.AWS_ROLE || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    mediaFilesS3Bucket: process.env.MEDIA_FILES_S3_BUCKET || '',
  },

  // S3 Configuration
  s3: {
    bucketName: process.env.S3_BUCKET_NAME || '',
    region: process.env.S3_REGION || 'us-east-1',
  },

  // PayTabs Configuration
  paytabs: {
    profileId: process.env.PAYTABS_PROFILE_ID || '',
    serverKey: process.env.PAYTABS_SERVER_KEY || '',
    region: process.env.PAYTABS_REGION || 'SAU',
    callbackUrl: process.env.PAYTABS_CALLBACK_URL || '',
  },

  // Logger Configuration
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || 'logs',
    serviceName: process.env.LOG_SERVICE_NAME || 'Nest RedisLock-backend',
    fileEnabled:
      process.env.LOG_FILE_ENABLED != null
        ? process.env.LOG_FILE_ENABLED === 'true'
        : true,
    levelToggles: {
      infoEnabled:
        process.env.LOG_LEVEL_INFO_ENABLED != null
          ? process.env.LOG_LEVEL_INFO_ENABLED === 'true'
          : true,
      warnEnabled:
        process.env.LOG_LEVEL_WARN_ENABLED != null
          ? process.env.LOG_LEVEL_WARN_ENABLED === 'true'
          : true,
      errorEnabled:
        process.env.LOG_LEVEL_ERROR_ENABLED != null
          ? process.env.LOG_LEVEL_ERROR_ENABLED === 'true'
          : true,
      debugEnabled:
        process.env.LOG_LEVEL_DEBUG_ENABLED != null
          ? process.env.LOG_LEVEL_DEBUG_ENABLED === 'true'
          : false,
    },
    mongo: {
      // Auto-enable when a URI is present unless explicitly disabled via LOG_MONGO_ENABLED=false
      enabled:
        process.env.LOG_MONGO_ENABLED != null
          ? process.env.LOG_MONGO_ENABLED === 'true'
          : !!(process.env.LOG_MONGO_URI || process.env.MONGO_URL),
      uri: process.env.LOG_MONGO_URI || process.env.MONGO_URL || '',
      collection: process.env.LOG_MONGO_COLLECTION || 'winston_logs',
      ttlDays: parseInt(process.env.LOG_MONGO_TTL_DAYS || '14', 10),
      batchSize: parseInt(process.env.LOG_MONGO_BATCH_SIZE || '50', 10),
      flushIntervalMs: parseInt(
        process.env.LOG_MONGO_FLUSH_INTERVAL_MS || '2000',
        10,
      ),
      useBuiltInTransport: process.env.LOG_MONGO_USE_BUILTIN === 'true',
    },
  },
});
