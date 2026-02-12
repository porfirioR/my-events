import { LoginUserApiRequest } from "./login-user-api-request"

export class CreateUserApiRequest extends LoginUserApiRequest {
  constructor(
    email: string,
    password: string,
    public name: string,
    public surname: string
  ) {
    super(email, password)
  }
}
