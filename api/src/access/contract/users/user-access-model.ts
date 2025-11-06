export class UserAccessModel {
  constructor(
    public id: number,
    public email: string,
    public dateCreated: Date,
    public password: string,
    public isEmailVerified: boolean,
    public emailVerifiedAt: Date | null
  ) {}
}