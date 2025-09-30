import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailAccessService } from '.';
import { MailerModule } from '@nestjs-modules/mailer';
import { MAIL_HOST, MAIL_PASSWORD, MAIL_USER } from '../../utility/constants';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>(MAIL_HOST),
          port: 587,
          ignoreTLS: true,
          secure: false,
          auth: {
            user: configService.get<string>(MAIL_USER),
            pass: configService.get<string>(MAIL_PASSWORD),
          },
        },
        defaults: {
          from: '"My Events" noreply@my-events.com',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [],
  providers: [
    ConfigService,
    MailAccessService,
  ],
  exports: [
    MailAccessService,
  ]
})
export class MailModule {}
