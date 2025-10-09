
export class ReimbursementRequest {
  constructor(
    public amount: number,
    public description: string | null,
  ) {}
}