import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import {
  UserRefreshToken,
  UserRefreshTokenSchema,
} from './schemas/user-refresh-token.schema';
import { Address, AddressSchema } from '../address/schemas/address.schema';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    MongooseModule.forFeature([
      { name: UserRefreshToken.name, schema: UserRefreshTokenSchema },
      { name: Address.name, schema: AddressSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret') || 'default-secret',
        signOptions: {
          expiresIn:
            configService.get<number>('jwt.accessTokenExpiration') || 3600,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
