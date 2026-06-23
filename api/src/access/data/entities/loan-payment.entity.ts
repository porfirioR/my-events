export interface LoanPaymentEntity {
  id: number;
  loanid: number;
  installmentid: number | null;
  amount: number;
  description: string | null;
  paymentdate: string;
}
