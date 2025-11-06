export interface ResetUserPasswordApiRequest {
  email: string;
  newPassword: string;
  token: string;
}
