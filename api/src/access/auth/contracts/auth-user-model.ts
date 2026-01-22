export class AuthUserModel {
  constructor(
    public id: number,
    public email: string,
    public passwordHash: string,
    public name: string,
    public surname: string,
  ) { }
}