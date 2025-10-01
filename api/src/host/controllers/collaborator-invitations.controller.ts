import { 
  Controller, 
  Get, 
  Param, 
  UseGuards, 
  ParseIntPipe 
} from '@nestjs/common';
import { CollaboratorManagerService } from '../../manager/services';
import { CurrentUserService } from '../services/current-user.service';
import { PrivateEndpointGuard } from '../guards/private-endpoint.guard';
import { 
  CollaboratorInvitationModel,
  ReceivedMatchRequestModel
} from '../../manager/models/collaborators';

@Controller('collaborators/invitations')
@UseGuards(PrivateEndpointGuard)
export class CollaboratorInvitationsController {
  constructor(
    private readonly currentUserService: CurrentUserService,
    private collaboratorManagerService: CollaboratorManagerService
  ) {}

  @Get('summary')
  async getInvitationsSummary(): Promise<CollaboratorInvitationModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.collaboratorManagerService.getInvitationsByCollaborator(userId);
  }

  @Get(':collaboratorId')
  async getCollaboratorInvitations(@Param('collaboratorId', ParseIntPipe) collaboratorId: number): Promise<ReceivedMatchRequestModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.collaboratorManagerService.getInvitationsForCollaborator(userId, collaboratorId);
  }
}