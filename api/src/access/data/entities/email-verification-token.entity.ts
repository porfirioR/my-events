export interface EmailVerificationTokenEntity {
  id: number;
  userid: number;
  token: string;
  expiresat: Date;
  isverified: boolean;
  createdat: Date;
  verifiedat: Date | null;
}
