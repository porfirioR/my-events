export class SignModel {
  constructor(
    public id: number,
    public email: string,
    public token: string,
    public isEmailVerified: boolean
  ) {}
}
