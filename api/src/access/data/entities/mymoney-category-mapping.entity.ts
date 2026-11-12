export interface MyMoneyCategoryMappingEntity {
  id: number;
  userid: number;
  categoryexternalid: string;
  categoryname: string;
  movementtype: number;
  kind: number;
  isessential: boolean;
  isextraordinary: boolean;
  accountid: number | null;
  savingsgoalid: number | null;
  loanid: number | null;
  needsreview: boolean;
  datecreated: string;
  dateupdated: string;
}
