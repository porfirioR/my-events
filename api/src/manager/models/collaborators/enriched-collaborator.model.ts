import { CollaboratorType, MatchStatus } from "../../../utility/types";
import { CollaboratorModel } from ".";

export class EnrichedCollaboratorModel extends CollaboratorModel {
  matchStatus?: MatchStatus;
  matchedWith?: {
    userId: number;
    collaboratorId: number;
    email: string;
  };
  pendingRequestsCount?: number;

  constructor(
    id: number,
    name: string,
    surname: string,
    email: string | null,
    userId: number,
    isActive: boolean,
    dateCreated: Date,
    type: CollaboratorType
  ) {
    super(id, name, surname, email, userId, isActive, dateCreated, type);
  }
}