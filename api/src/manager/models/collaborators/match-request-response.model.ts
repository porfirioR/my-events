/**
 * Response de solicitud de matching
 */
export class MatchRequestResponseModel {
  constructor(
    public requestId: number,
    public status: string,
    public emailExists: boolean,
    public message: string,
    public targetUserId?: number
  ) {}
}