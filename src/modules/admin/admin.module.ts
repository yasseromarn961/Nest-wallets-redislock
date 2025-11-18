import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminService } from './admin.service';
import { AdminAuthService } from './admin-auth.service';
import { AdminController } from './admin.controller';
import { AdminAuthController } from './admin-auth.controller';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { AdminAuthServiceClient } from '../../common/services/external/admin-auth-service-client';

@Module({
  imports: [
    PassportModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default-secret',
        signOptions: {
          expiresIn: parseInt(
            configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION') || '3600',
          ),
        },
      }),
    }),
  ],
  controllers: [AdminController, AdminAuthController],
  providers: [
    AdminService,
    AdminAuthService,
    AdminJwtStrategy,
    AdminAuthServiceClient,
  ],
  exports: [AdminService, AdminAuthService],
})
export class AdminModule {}
