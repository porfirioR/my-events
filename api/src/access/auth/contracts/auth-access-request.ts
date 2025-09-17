export class AuthAccessRequest {
  constructor(
    public email: string,
    public passwordHash: string
  ) { }
}