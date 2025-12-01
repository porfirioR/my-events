import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { AllExceptionsFilter } from './filters/exception.filter';
import { ManagerModule } from '../manager/manager.module';
import { LoginMiddleware } from './middleware/login.middleware';
import { SignupMiddleware } from './middleware/signup.middleware';
import { ResetPasswordMiddleware } from './middleware/reset-password.middleware';
import { PrivateEndpointGuard } from './guards/private-endpoint.guard';
import { TasksService } from './services/tasks.service';
import { CurrentUserService } from './services/current-user.service';
import { UsersController } from './controllers/users.controller';
import { EventsController } from './controllers/events.controller';
import { PaymentController } from './controllers/payments.controller';
import { ConfigurationController } from './controllers/configuration.controller';
import { TransactionController } from './controllers/transaction.controller';
import { CollaboratorInvitationsController, CollaboratorMatchesController, CollaboratorMatchRequestsController, CollaboratorsController, SavingsGoalsController } from './controllers';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ManagerModule,
    CacheModule.register({
      ttl: 3600, // 1 hour in seconds (equals that JWT)
      max: 100, // max 100 item in cache
    }),
  ],
  controllers: [
    UsersController,
    EventsController,
    PaymentController,
    SavingsGoalsController,
    ConfigurationController,
    CollaboratorMatchesController,
    CollaboratorMatchRequestsController,
    CollaboratorInvitationsController,
    CollaboratorsController,
    TransactionController
  ],
  providers: [
    JwtService,
    CurrentUserService,
    ConfigService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter
    },
    {
      provide: APP_GUARD,
      useClass: PrivateEndpointGuard,
    },
    TasksService
  ],
})
export class ControllerModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoginMiddleware)
      .forRoutes({ path: 'users/login', method: RequestMethod.POST });

    consumer
      .apply(ResetPasswordMiddleware)
      .forRoutes({ path: 'users/reset-password', method: RequestMethod.POST });

    consumer
      .apply(SignupMiddleware)
      .forRoutes({ path: 'users/sign-up', method: RequestMethod.POST });
  }
}
