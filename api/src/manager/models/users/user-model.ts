export class UserModel {
  constructor(
    public id: number,
    public email: string,
    public name: string,
    public surname: string,
    public dateCreated: Date,
    public token: string,
    public isEmailVerified: boolean
  ) {}
}