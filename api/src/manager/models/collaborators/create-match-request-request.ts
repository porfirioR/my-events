/**
 * Request para crear solicitud de matching
 */
export class CreateMatchRequestRequest {
  constructor(
    public collaboratorId: number,
    public targetEmail: string
  ) {}
}