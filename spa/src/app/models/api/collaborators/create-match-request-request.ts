export class CreateMatchRequestRequest {
  constructor(
    public collaboratorId: number,
    public targetEmail: string
  ) { }
}