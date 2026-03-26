import { Global, Module } from '@nestjs/common';
import { AppLoggerService } from './services/app-logger.service';

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [AppLoggerService],
  exports: [AppLoggerService]
})
export class UtilityModule {}
