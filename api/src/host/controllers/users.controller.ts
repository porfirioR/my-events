import { Body, Controller, Get, Headers, Logger, Post, UseGuards } from '@nestjs/common';
import { MailManagerService, UserManagerService } from '../../manager/services';
import { ResetUserPasswordRequest, SignModel, UserModel, UserRequest, WebPushModel, WebPushRequest } from '../../manager/models/users';
import { CreateUserApiRequest } from '../models/users/create-user-api-request';
import { Public } from '../decorators/public.decorator';
import { PrivateEndpointGuard } from '../guards/private-endpoint.guard';
import { ForgotPasswordEndpointGuard } from '../guards/forgot-password-endpoint.guard';
import { DatabaseColumns } from '../../utility/enums';
import { ResetUserPasswordApiRequest } from '../models/users/reset-user-password-api-request';
import { ForgotPasswordApiRequest } from '../models/users/forgot-password-api-request';
import { WebPushApiRequest } from '../models/users/web-push-api-request';
import { USER_AUTHORIZATION } from '../../utility/constants';

@Controller('users')
@UseGuards(PrivateEndpointGuard)
export class UsersController {
  private readonly logger = new Logger('UsersController');

  constructor(private userManagerService: UserManagerService,
    private mailManagerService: MailManagerService
  ) {
    this.logger.log('🎯 Controller register user');
  }

  @Get('admin')
  async getUsers(): Promise<UserModel[]> {
    this.logger.log('UsersController: getUsers');
    const modelList = await this.userManagerService.getUsers();
    return modelList;
  }

  @Get()
  async getUserByEmail(@Headers(DatabaseColumns.Email) email: string): Promise<UserModel> {
    this.logger.log('UsersController: getUserByEmail');
    const model = await this.userManagerService.getUserByEmail(email);
    return model;
  }

  @Post('sign-up')
  @Public()
  async registerUser(@Body() apiRequest: CreateUserApiRequest): Promise<SignModel> {
    this.logger.log('UsersController: registerUser');
    const request = new UserRequest(apiRequest.email, apiRequest.password);
    const model = await this.userManagerService.registerUser(request);
    return model
  }

  @Post('login')
  @Public()
  async login(@Headers(USER_AUTHORIZATION) authorization: string): Promise<SignModel> {
    this.logger.log('UsersController: login');
    const model = await this.userManagerService.loginUser(authorization);
    return model;
  }

  @Post('forgot-password')
  @Public()
  @UseGuards(ForgotPasswordEndpointGuard)
  async forgotPassword(@Body() apiRequest: ForgotPasswordApiRequest): Promise<boolean> {
    this.logger.log('UsersController: forgotPassword');
    const model = await this.mailManagerService.forgotPassword(apiRequest.email);
    return model;
  }

  @Post('reset-password')
  @Public()
  async resetPassword(@Body() apiRequest: ResetUserPasswordApiRequest): Promise<SignModel> {
    this.logger.log('UsersController: resetPassword');
    const request = new ResetUserPasswordRequest(apiRequest.email, apiRequest.newPassword, apiRequest.code)
    const model = await this.userManagerService.resetUserPassword(request)
    return model
  }

  @Post('save-token')
  @Public()
  async saveKey(@Body() apiRequest: WebPushApiRequest): Promise<WebPushModel> {
    this.logger.log('UsersController: saveKey');
    const request = new WebPushRequest(apiRequest.endpoint, apiRequest.expirationTime, apiRequest.keys, apiRequest.email)
    const model = await this.userManagerService.saveToken(request)
    return model
  }
}
