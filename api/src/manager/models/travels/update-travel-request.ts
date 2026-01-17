import { CreateTravelRequest } from ".";

export class UpdateTravelRequest extends CreateTravelRequest {
  constructor(
    public id: number,
    userId: number,
    name: string,
    description: string | null,
    startDate: Date | null,
    endDate: Date | null,
    defaultCurrencyId: number | null,
  ) {
    super(
      userId,
      name,
      description,
      startDate,
      endDate,
      defaultCurrencyId
    )
  }
}