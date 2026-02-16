import { Injectable } from '@angular/core'

@Injectable({
  providedIn: 'root'
})
export class LocalService {
  private readonly emailKey = 'email'
  private readonly nameKey = 'name'
  private readonly surnameKey = 'surname'
  private readonly userKey = 'user'
  private readonly collaboratorKey = 'collaborator'
  private readonly jwtToken = 'jwt'
  private readonly isEmailVerified = 'isEmailVerified'

  public getEmail = (): string | null => localStorage.getItem(this.emailKey) ?? ''
  public setEmail = (email: string): void => localStorage.setItem(this.emailKey, email)
  public setName = (name: string): void => localStorage.setItem(this.nameKey, name)
  public getName = (): string | null => localStorage.getItem(this.nameKey) ?? ''

  public setSurname = (surname: string): void => localStorage.setItem(this.surnameKey, surname)
  public getSurname = (): string | null => localStorage.getItem(this.surnameKey) ?? ''

  public getUserId = (): number => +(localStorage.getItem(this.userKey) ?? -1)
  public setUserId = (id: number): void => localStorage.setItem(this.userKey, id.toString())

  public getCollaboratorId = (): number => +(localStorage.getItem(this.collaboratorKey) ?? -1)
  public setCollaboratorId = (collaboratorId: number): void => localStorage.setItem(this.collaboratorKey, collaboratorId.toString())

  public getJwtToken = (): string | null => localStorage.getItem(this.jwtToken)
  public setJwtToken = (token: string): void => localStorage.setItem(this.jwtToken, token)

  public cleanCredentials = (): void => localStorage.clear()

  public setEmailVerified = (isVerified: boolean): void => localStorage.setItem(this.isEmailVerified, JSON.stringify(isVerified));
  public getEmailVerified = (): boolean => {
    const value = localStorage.getItem(this.isEmailVerified);
    return value ? JSON.parse(value) : false;
  };
}
