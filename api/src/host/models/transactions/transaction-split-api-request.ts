export interface TransactionSplitApiRequest {
  participantType: 'user' | 'collaborator'; // ⭐ NUEVO
  amount: number;
  sharePercentage?: number;
}