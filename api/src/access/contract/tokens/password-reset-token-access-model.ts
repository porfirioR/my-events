export class PasswordResetTokenAccessModel {
  constructor(
    public id: number,
    public userId: number,
    public token: string,
    public expiresAt: Date,
    public isUsed: boolean,
    public createdAt: Date,
    public usedAt: Date | null,
    public ipAddress: string | null
  ) {}
}