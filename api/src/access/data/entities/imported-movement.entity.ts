export interface ImportedMovementEntity {
  id: number;
  userid: number;
  externalid: string;
  categoryexternalid: string;
  // 'YYYY-MM-DD'
  movementdate: string;
  movementtype: number;
  amount: number;
  note: string;
  datecreated: string;
  dateupdated: string;
}
