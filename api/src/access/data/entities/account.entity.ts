export interface AccountEntity {
  id: number;
  userid: number;
  institutionid: number;
  currencyid: number;
  name: string;
  type: number;
  isactive: boolean;
  notes: string | null;
  datecreated: string;
  dateupdated: string;
}
