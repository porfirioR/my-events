export class CreateEmailVerificationTokenRequest {
  constructor(
    public userId: number,
    public token: string,
    public expiresAt: Date
  ) {}
}