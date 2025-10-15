export class ReimbursementApiRequest {
  constructor(
    public amount: number,
    public description?: string | null
  ) {}
}