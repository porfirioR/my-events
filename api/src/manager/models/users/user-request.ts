export class UserRequest {
  constructor(
    public email: string,
    public password: string,
    public name: string,
    public surname: string,
  ) {}
}