export class ResetUserPasswordRequest {
  constructor(
    public email: string,
    public password: string,
    public token: string
  ) {}
}
