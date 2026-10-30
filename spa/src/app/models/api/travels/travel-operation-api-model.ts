import { OperationParticipantApiModel } from './operation-participant-api-model';

export interface TravelOperationApiModel {
  id: number;
  travelId: number;
  createdByUserId: number;
  currencyId: number;
  paymentMethodId: number;
  whoPaidMemberId: number;
  amount: number;
  description: string;
  participantType: string;
  splitType: string;
  status: string;
  dateCreated: Date;
  transactionDate: Date;
  lastUpdatedByUserId: number | null;
  updatedAt: Date | null;
  currencySymbol?: string;
  paymentMethodName?: string;
  whoPaidMemberName?: string;
  participantCount?: number;
  approvalCount?: number;
  pendingApprovalCount?: number;
  categoryId: number;
  participants?: OperationParticipantApiModel[];
  // Lo que cobró el banco en otra moneda (tarjeta); null si no se registró
  chargedAmount?: number | null;
  chargedCurrencyId?: number | null;
  // Entidad de la tarjeta o el banco con que se pagó (opcional)
  paymentInstitutionId?: number | null;
  paymentInstitutionName?: string | null;
}
