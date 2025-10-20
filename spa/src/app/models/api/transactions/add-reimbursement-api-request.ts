export class AddReimbursementApiRequest {
  constructor(
    public amount: number,
    public description?: string | null
  ) {}
}