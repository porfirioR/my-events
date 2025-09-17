import { Injectable } from '@nestjs/common';
import { EventModel } from '../models/events/event-model';
import { EventAccessService, EventFollowAccessService } from '../../access/mail';
import { CreateEventRequest } from '../models/events/create-event-request';
import { UpdateEventRequest } from '../models/events/update-event-request';
import { CreateEventAccessRequest } from '../../access/contract/events/create-event-access-request';
import { EventAccessModel } from '../../access/contract/events/event-access-model';
import { UpdateEventAccessRequest } from '../../access/contract/events/update-event-access-request';
import { EventFollowRequest } from '../../access/contract/event-follows/event-follow-request';

@Injectable()
export class EventManagerService {

  constructor(
    private eventAccessService: EventAccessService,
    private eventFollowAccessService: EventFollowAccessService
  ) { }

  public getPublicEvents = async (): Promise<EventModel[]> => {
    const accessModelList = await this.eventAccessService.getPublicEvents();
    return accessModelList.map(x => ({ ...x, _className: EventModel }))
  }

  public getMyEvents = async (authorId: number): Promise<EventModel[]> => {
    const accessModelList = await this.eventAccessService.getMyEvents(authorId);
    return accessModelList.map(this.getModel)
  }

  public getMyEvent = async (id: number): Promise<EventModel> => {
    const accessModel = await this.eventAccessService.getMyEvent(id);
    return this.getModel(accessModel)
  }

  public getMyEventFollows = async (id: number): Promise<EventModel[]> => {
    const accessModelList = await this.eventFollowAccessService.getEventFollows(id);
    return accessModelList.map(this.getModel)
  }

  public createEvent = async (request: CreateEventRequest): Promise<EventModel> => {
    const accessRequest = new CreateEventAccessRequest(request.name, request.authorId, request.description, request.date, request.isPublic)
    const accessModel = await this.eventAccessService.createEvent(accessRequest);
    if (accessModel.isPublic) {
      await this.createEventFollow(new EventFollowRequest(accessModel.id, request.authorId))
    }
    return this.getModel(accessModel)
  }

  public createEventFollow = async (request: EventFollowRequest): Promise<boolean> => {
    return await this.eventFollowAccessService.createEventFollow(request)
  }

  public deleteEventFollow = async (request: EventFollowRequest): Promise<boolean> => {
    return await this.eventFollowAccessService.deleteEventFollow(request)
  }

  public updateEvent = async (request: UpdateEventRequest): Promise<EventModel> => {
    const accessRequest = new UpdateEventAccessRequest(request.id, request.name, request.description, request.date, request.isPublic)
    const accessModel = await this.eventAccessService.updateEvent(accessRequest);
    const exitEventFollow = await this.eventFollowAccessService.checkExistEventFollows(new EventFollowRequest(accessModel.id, accessModel.authorId))
    if (exitEventFollow && !accessModel.isPublic) {
      await this.deleteEventFollow(new EventFollowRequest(accessModel.id, accessModel.authorId))
    }
    if (!exitEventFollow && accessModel.isPublic) {
      await this.createEventFollow(new EventFollowRequest(accessModel.id, accessModel.authorId))
    }
    return this.getModel(accessModel)
  }

  private getModel = (accessModel: EventAccessModel) => new EventModel(
    accessModel.id,
    accessModel.name,
    accessModel.authorId,
    accessModel.description,
    accessModel.isActive,
    accessModel.date,
    accessModel.isPublic
  )

}
