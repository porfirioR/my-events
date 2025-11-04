export class CreatePasswordResetTokenRequest {
  constructor(
    public userId: number,
    public token: string,
    public expiresAt: Date,
    public ipAddress?: string
  ) {}
}