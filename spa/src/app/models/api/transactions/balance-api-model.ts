import { CollaboratorInfoApiModel } from '../collaborators';

export interface BalanceApiModel {
  userId: number;
  collaboratorId: number;
  userOwes: number;
  collaboratorOwes: number;
  netBalance: number;
  collaboratorInfo: CollaboratorInfoApiModel;
}
