import { Body, Controller, Get, Headers, Post, UseGuards } from '@nestjs/common';
import { UserManagerService } from '../../manager/services';
import { UserModel } from '../../manager/models/users/user-model';
import { UserRequest } from '../../manager/models/users/user-request';
import { CreateUserApiRequest } from '../models/users/create-user-api-request';
import { AdminGuard } from '../guards/admin.guard';
import { PrivateEndpointGuard } from '../guards/private-endpoint.guard';

@Controller('users')
export class UsersController {
  constructor(private userManagerService: UserManagerService) { }

  @Get('admin')
  @UseGuards(AdminGuard, PrivateEndpointGuard)
  async getUsers(): Promise<UserModel[]> {
    const modelList = await this.userManagerService.getUsers();
    return modelList;
  }

  @Get()
  @UseGuards(PrivateEndpointGuard)
  async getUserByEmail(@Headers('email') email: string): Promise<UserModel> {
    const model = await this.userManagerService.getUserByEmail(email);
    return model;
  }

  @Post('sign-up')
  async registerUser(@Body() apiRequest: CreateUserApiRequest): Promise<UserModel> {
    const request = new UserRequest(apiRequest.email, apiRequest.password);
    const model = await this.userManagerService.registerUser(request);
    return model;
  }

  @Post('login')
  async login(@Headers('authorization') authorization: string): Promise<string> {
    const model = await this.userManagerService.loginUser(authorization);
    return model;
  }
}
