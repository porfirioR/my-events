import { Injectable } from '@angular/core'

@Injectable({
  providedIn: 'root'
})
export class LocalService {
  private readonly emailKey = 'email'
  private readonly userKey = 'user'
  private readonly jwtToken = 'jwt'

  public getEmail = (): string | null => localStorage.getItem(this.emailKey) ?? ''
  public setEmail = (email: string): void => localStorage.setItem(this.emailKey, email)

  public getUserId = (): number => +(localStorage.getItem(this.userKey) ?? -1)
  public setUserId = (id: number): void => localStorage.setItem(this.userKey, id.toString())

  public getJwtToken = (): string | null => localStorage.getItem(this.jwtToken)
  public setJwtToken = (token: string): void => localStorage.setItem(this.jwtToken, token)

  public cleanCredentials = (): void => localStorage.clear()
}
