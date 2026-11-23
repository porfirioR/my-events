export interface UserFinancialSettingsEntity {
  userid: number;
  currencyid: number;
  monthlynetincome: number | null;
  monthlyessentialexpense: number | null;
  cushiongreenmonths: number;
  cushionyellowmonths: number;
  savingsgreenpercentage: number;
  savingsyellowpercentage: number;
  debtgreenpercentage: number;
  debtyellowpercentage: number;
  monthlysummaryemail: boolean;
  language: string;
  datecreated: string;
  dateupdated: string;
}
