import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { Logger } from '@nestjs/common'
import { AppModule } from './app.module'
import { LOCAL_DEV, SPA_URL, SPA_URL2 } from './utility/constants'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const configService = app.get(ConfigService);
  const logger = new Logger('NestApplication');

  // Debug: Verificar que las variables se están cargando
  logger.log(`🔍 Environment variables:`);
  logger.log(`   SPA_URL: ${configService.get(SPA_URL)}`);
  logger.log(`   SPA_URL2: ${configService.get(SPA_URL2)}`);
  logger.log(`   LOCAL_DEV: ${configService.get(LOCAL_DEV)}`);

  app.setGlobalPrefix('api')
  app.enableCors({
    origin: [
      configService.get<string>(SPA_URL), 
      configService.get<string>(SPA_URL2)
    ]
  })

  const isLocalDev: boolean = configService.get<boolean>(LOCAL_DEV) || false;
  const port = configService.get<number>('PORT') || 3000;

  if (isLocalDev) {
    await app.listen(port, () => {
      logger.log(`🚀 Server started in development mode`);
      logger.log(`🔗 URL: http://localhost:${port}`);
    })
  } else {
    await app.listen(port, () => {
      logger.log(`🚀 Server started in production mode`);
      logger.log(`🔗 Port: ${port}`);
    })
  }
}
bootstrap()