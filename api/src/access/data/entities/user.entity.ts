export interface UserEntity {
  id: number;
  email: string;
  password: string;
  name: string;
  surname: string;
  datecreated: Date;
  isemailverified: boolean;
  emailverifiedat: Date | null;
}
