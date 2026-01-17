export interface TravelApiModel {
  id: number;
  name: string;
  createdByUserId: number;
  status: string;
  dateCreated: Date;
  description: string | null;
  startDate: Date | null;
  endDate: Date | null;
  defaultCurrencyId: number | null;
  lastUpdatedByUserId: number | null;
  updatedAt: Date | null;
  finalizedDate: Date | null;
}