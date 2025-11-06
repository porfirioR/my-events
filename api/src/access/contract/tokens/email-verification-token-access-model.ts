export class EmailVerificationTokenAccessModel {
  constructor(
    public id: number,
    public userId: number,
    public token: string,
    public expiresAt: Date,
    public isVerified: boolean,
    public createdAt: Date,
    public verifiedAt: Date | null
  ) {}
}