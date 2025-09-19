import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { JwtService } from '@nestjs/jwt';
import { AuthUserModel } from './contracts/auth-user-model';
import { AuthAccessRequest } from './contracts/auth-access-request';
import * as bcrypt from 'bcrypt';
import { Cache } from 'cache-manager';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) { }

  public getToken = async (payload: AuthUserModel): Promise<string> => {
    const token = await this.jwtService.signAsync({ id: payload.id, email: payload.email })
    await this.cacheManager.set(`user_${token}`, payload.id, 3600000) // 1 hour in ms

    return token
  }

  public getUserIdFromToken = async (token: string): Promise<string | null> => {
    return await this.cacheManager.get(`user_${token}`)
  }

  public clearUserCache = async (token: string): Promise<void> => {
    await this.cacheManager.del(`user_${token}`);
  }

  public getHash = async (userPassword: string): Promise<string> => {
    const saltRounds = 10;
    const hash = await bcrypt.hash(userPassword, saltRounds);
    return hash
  }

  public checkUser = async (request: AuthAccessRequest, userModel: AuthUserModel): Promise<boolean> => {
    const passwordMatch = await bcrypt.compare(request.passwordHash, userModel.passwordHash)
    const emailMatch = request.email === userModel.email
    if(passwordMatch && emailMatch) {
      return true
    }
    throw new UnauthorizedException('The email and/or password is incorrect')
  }
}