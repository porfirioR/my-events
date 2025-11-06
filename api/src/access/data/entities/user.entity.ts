export interface UserEntity {
  id: number;
  email: string;
  password: string;
  datecreated: Date;
  isemailverified: boolean;
  emailverifiedat: Date | null;
}
