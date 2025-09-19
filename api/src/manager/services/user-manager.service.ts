import { Injectable } from '@nestjs/common';
import { CreateUserAccessRequest } from '../../access/contract/users/create-user-access-request';
import { UserAccessModel } from '../../access/contract/users/user-access-model';
import { ResetUserAccessRequest } from '../../access/contract/users/reset-user-password-access-request';
import { WebPushTokenKey } from '../../access/contract/users/web-push-token-key';
import { WebPushTokenAccessRequest } from '../../access/contract/users/web-push-token-access-request';
import { ResetUserPasswordRequest, SignModel, UserModel, UserRequest, WebPushModel, WebPushRequest } from '../models/users';
import { AuthService } from '../../access/auth/auth.service';
import { AuthUserModel } from '../../access/auth/contracts/auth-user-model';
import { AuthAccessRequest } from '../../access/auth/contracts/auth-access-request';
import { UserAccessService } from '../../access/data/services/user-access.service';

@Injectable()
export class UserManagerService {
  constructor(
    private userAccessService: UserAccessService,
    private authService: AuthService
  ) { }

  public getUsers = async (): Promise<UserModel[]> => {
    const accessModelList = await this.userAccessService.getUsers();
    return accessModelList.map(x => this.getUserModel(x));
  };

  public registerUser = async (request: UserRequest): Promise<SignModel> => {
    const password = await this.authService.getHash(request.password)
    const accessModel = await this.userAccessService.createUser(new CreateUserAccessRequest(request.email, password));
    const authModel = new AuthUserModel(accessModel.id, accessModel.email, accessModel.password)
    const jwtToken = await this.authService.getToken(authModel)
    return new SignModel(accessModel.id, accessModel.email, jwtToken);
  };

  public loginUser = async (request: string): Promise<SignModel> => {
    const key = request.split('Basic ').at(1)
    const [email, password] = atob(key).split(':')
    const accessModel = await this.userAccessService.getUserByEmail(email);
    const authModel = new AuthUserModel(accessModel.id, accessModel.email, accessModel.password);
    await this.authService.checkUser(new AuthAccessRequest(email, password), authModel);
    const jwtToken = await this.authService.getToken(authModel);
    return new SignModel(accessModel.id, email, jwtToken);
  };

  public getUserByEmail = async (email: string): Promise<UserModel> => {
    const accessModel = await this.userAccessService.getUserByEmail(email);
    return this.getUserModel(accessModel);
  };

  public resetUserPassword = async (request: ResetUserPasswordRequest): Promise<SignModel> => {
    const password = await this.authService.getHash(request.password)
    const accessModel = await this.userAccessService.resetPassword(new ResetUserAccessRequest(request.email, password));
    const authModel = new AuthUserModel(accessModel.id, accessModel.email, '')
    const jwtToken = await this.authService.getToken(authModel)
    return new SignModel(accessModel.id, accessModel.email, jwtToken);
  };

  public saveToken = async (request: WebPushRequest): Promise<WebPushModel> => {
    const userModel = await this.getUserByEmail(request.email)
    const keys = new WebPushTokenKey(request.keys.auth, request.keys.p256dh)
    const accessRequest = new WebPushTokenAccessRequest(request.endpoint, request.expirationTime, keys, userModel.email)
    const accessModel = await this.userAccessService.saveToken(accessRequest);
    const model = new WebPushModel(accessModel.id, accessModel.endpoint, accessModel.expirationTime, accessModel.keys)
    return model;
  };

  public getWebPushToken = async (): Promise<WebPushModel> => {
    const accessModel = await this.userAccessService.getWebPushToken();
    const model = new WebPushModel(accessModel.id, accessModel.endpoint, accessModel.expirationTime, accessModel.keys)
    return model;
  };

  private getUserModel = (accessModel: UserAccessModel, token: string = ''): UserModel => new UserModel(accessModel.id, accessModel.email, accessModel.dateCreated, token.length ? token : accessModel.code);
}
