export class TravelMemberEntity {
  public id?: number;

  constructor(
    public travelid: number,
    public userid: number,
    public collaboratorid: number,
    public joineddate?: Date,
    // Usuario real del miembro (null = sin cuenta vinculada). userid es el dueño del colaborador
    public memberuserid: number | null = null,
  ) {}
}