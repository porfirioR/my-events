export interface LoanInstallmentEntity {
  id: number;
  loanid: number;
  installmentnumber: number;
  duedate: string | null;
  totalamount: number;
  principalamount: number;
  interestamount: number;
  remainingbalance: number;
  statusid: number;
  paiddate: string | null;
  paidamount: number | null;
  datecreated: string;
}
