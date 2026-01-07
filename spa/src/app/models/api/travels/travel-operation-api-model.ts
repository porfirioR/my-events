export interface TravelOperationApiModel {
  id: number;
  travelId: number;
  createdByUserId: number;
  currencyId: number;
  paymentMethodId: number;
  whoPaidMemberId: number;
  amount: number;
  description: string;
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
}