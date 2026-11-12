export interface MyMoneyDescriptionRuleEntity {
  id: number;
  userid: number;
  pattern: string;
  accountid: number | null;
  savingsgoalid: number | null;
  loanid: number | null;
  datecreated: string;
  dateupdated: string;
}
