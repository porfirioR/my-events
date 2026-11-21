export interface ImportedMovementLinkEntity {
  id: number;
  userid: number;
  importedmovementid: number;
  savingsinstallmentid: number | null;
  loaninstallmentid: number | null;
  datecreated: string;
}
