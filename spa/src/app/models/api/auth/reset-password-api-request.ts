export class ResetPasswordApiRequest {
  constructor(
    public email: string,
    public token: string,
    public newPassword: string,
  ) { }
}
