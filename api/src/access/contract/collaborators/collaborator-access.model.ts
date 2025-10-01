import { CollaboratorType } from "../../../utility/types";

export class CollaboratorAccessModel {
  constructor(
    public id: number,
    public name: string,
    public surname: string,
    public email: string | null,
    public userId: number,
    public isActive: boolean,
    public dateCreated: Date,
    public type: CollaboratorType
  ) {}
}