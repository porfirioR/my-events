export class SignModel {
  constructor(
    public id: number,
    public email: string,
    public name: string,
    public surname: string,
    public token: string,
    public isEmailVerified: boolean,
    public userCollaboratorId: number
  ) {}
}
