import { CurrentUserService } from './host/services/current-user.service';
import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { UtilityModule } from './utility/utility.module';
import { ControllerModule } from './host/controller.module';

@Module({
  imports: [
    UtilityModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),
    ControllerModule
  ],
  controllers: [],
  providers: []
})
export class AppModule {}
