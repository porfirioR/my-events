import { 
  Controller, 
  Get, 
  Post, 
  Patch,
  Delete,
  Body, 
  Param, 
  UseGuards, 
  ParseIntPipe 
} from '@nestjs/common';
import { CollaboratorManagerService } from '../../manager/services';
import { CurrentUserService } from '../services/current-user.service';
import { PrivateEndpointGuard } from '../guards/private-endpoint.guard';
import { 
  CreateMatchRequestRequest,
  MatchRequestResponseModel,
  ReceivedMatchRequestModel,
  CollaboratorMatchModel,
  CollaboratorMatchRequestModel
} from '../../manager/models/collaborators';
import { CreateMatchRequestApiRequest } from '../models/collaborators/create-match-request-api-request';
import { MessageModel } from '../models/message.model';

@Controller('collaborators/match-requests')
@UseGuards(PrivateEndpointGuard)
export class CollaboratorMatchRequestsController {
  constructor(
    private readonly currentUserService: CurrentUserService,
    private collaboratorManagerService: CollaboratorManagerService
  ) {}

  @Post()
  async createMatchRequest(@Body() apiRequest: CreateMatchRequestApiRequest): Promise<MatchRequestResponseModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    const request = new CreateMatchRequestRequest(
      apiRequest.collaboratorId,
      apiRequest.targetEmail
    );
    return await this.collaboratorManagerService.createMatchRequest(userId, request);
  }

  @Get('received')
  async getReceivedRequests(): Promise<ReceivedMatchRequestModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.collaboratorManagerService.getReceivedMatchRequests(userId);
  }

  @Get('sent')
  async getSentRequests(): Promise<CollaboratorMatchRequestModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.collaboratorManagerService.getSentMatchRequests(userId);
  }

  @Patch(':id/accept')
  async acceptRequest(@Param('id', ParseIntPipe) id: number): Promise<CollaboratorMatchModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.collaboratorManagerService.acceptMatchRequest(userId, id);
  }

  @Delete(':id')
  async cancelRequest(@Param('id', ParseIntPipe) id: number): Promise<MessageModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    await this.collaboratorManagerService.cancelMatchRequest(userId, id);
    return new MessageModel('Match request cancelled successfully');
  }
}