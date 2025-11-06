export interface PasswordResetTokenEntity {
  id: number;
  userid: number;
  token: string;
  expiresat: Date;
  isused: boolean;
  createdat: Date;
  usedat: Date | null;
  ipaddress: string | null;
}