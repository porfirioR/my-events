import { 
  Controller, 
  Get, 
  Delete,
  Param, 
  UseGuards, 
  ParseIntPipe 
} from '@nestjs/common';
import { CollaboratorManagerService } from '../../manager/services';
import { CurrentUserService } from '../services/current-user.service';
import { PrivateEndpointGuard } from '../guards/private-endpoint.guard';
import { CollaboratorMatchModel } from '../../manager/models/collaborators';
import { MessageModel } from '../models/message.model';

@Controller('collaborators/matches')
@UseGuards(PrivateEndpointGuard)
export class CollaboratorMatchesController {
  constructor(
    private readonly currentUserService: CurrentUserService,
    private collaboratorManagerService: CollaboratorManagerService
  ) {}

  @Get()
  async getMatches(): Promise<CollaboratorMatchModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.collaboratorManagerService.getUserMatches(userId);
  }

  @Delete(':id')
  async deleteMatch(@Param('id', ParseIntPipe) id: number): Promise<MessageModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    await this.collaboratorManagerService.deleteMatch(userId, id);
    return new MessageModel('Match deleted successfully');
  }
}