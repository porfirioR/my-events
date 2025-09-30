import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { JWT_TOKEN } from '../../utility/constants';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  providers: [AuthService],
  imports: [
    ConfigModule,
    CacheModule.register({
      ttl: 3600, // 1 hour in seconds (equals that JWT)
      max: 100, // max 100 item in cache
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        global: true,
        secret: configService.get<string>(JWT_TOKEN),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService]
    }),
  ],
  exports: [
    AuthService
  ]
})
export class AuthModule {}
