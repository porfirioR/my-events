import { OperationParticipantModel } from "./operation-participant-model";

export class TravelOperationModel {
  constructor(
    public id: number,
    public travelId: number,
    public createdByUserId: number,
    public currencyId: number,
    public paymentMethodId: number,
    public whoPaidMemberId: number,
    public amount: number,
    public description: string,
    public participantType: string,
    public splitType: string,
    public status: string,
    public dateCreated: Date,
    public transactionDate: Date,
    public lastUpdatedByUserId: number | null,
    public updatedAt: Date | null,
    public categoryId: number,
    public currencySymbol?: string,
    public paymentMethodName?: string,
    public whoPaidMemberName?: string,
    public participantCount?: number,
    public approvalCount?: number,
    public pendingApprovalCount?: number,
    public participants?: OperationParticipantModel[],
    // Lo que cobró el banco en otra moneda (tarjeta); null si no se registró
    public chargedAmount: number | null = null,
    public chargedCurrencyId: number | null = null,
    // Entidad de la tarjeta o el banco con que se pagó (opcional)
    public paymentInstitutionId: number | null = null,
    public paymentInstitutionName: string | null = null,
  ) {}
}