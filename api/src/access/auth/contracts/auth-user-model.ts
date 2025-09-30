export class AuthUserModel {
  constructor(
    public id: number,
    public email: string,
    public passwordHash: string
  ) { }
}