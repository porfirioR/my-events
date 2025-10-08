import { Injectable } from '@nestjs/common';
import { TableEnum, DatabaseColumns } from '../../../utility/enums';
import { CreateEventAccessRequest } from '../../contract/events/create-event-access-request';
import { EventAccessModel } from '../../contract/events/event-access-model';
import { UpdateEventAccessRequest } from '../../contract/events/update-event-access-request';
import { EventEntity } from '../entities/event.entity';
import { BaseAccessService, DbContextService } from '.';

@Injectable()
export class EventAccessService extends BaseAccessService {

  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  public getPublicEvents = async (): Promise<EventAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Events)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.IsActive, true)
      .eq(DatabaseColumns.IsPublic, true)
      .order('date', {ascending: false});
    if (error) throw new Error(error.message);
    return data?.map(this.getEventAccessModel);
  };

  public getMyEvents = async (authorId: number): Promise<EventAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Events)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.AuthorId, authorId)
      .order('date', {ascending: false});
    if (error) throw new Error(error.message);
    return data?.map(this.getEventAccessModel);
  };

  public getMyEvent = async (id: number): Promise<EventAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Events)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.EntityId, id)
      .single();
    if (error) throw new Error(error.message);
    return this.getEventAccessModel(data);
  };

  public createEvent = async (accessRequest: CreateEventAccessRequest): Promise<EventAccessModel> => {
    const eventEntity = this.getEntity(accessRequest);
    const event  = await this.dbContext
      .from(TableEnum.Events)
      .insert(eventEntity)
      .select()
      .single<EventEntity>();
    if (event.error) throw new Error(event.error.message);
    return this.getEventAccessModel(event.data);
  };

  public updateEvent = async (accessRequest: UpdateEventAccessRequest): Promise<EventAccessModel> => {
    const eventEntity = this.getEntity(accessRequest);
    const entity = await this.getMyEvent(accessRequest.id)
    eventEntity.authorid = entity.authorId
    const event = await this.dbContext
      .from(TableEnum.Events)
      .upsert(eventEntity)
      .select()
      .single<EventEntity>();
    if (event.error) throw new Error(event.error.message);
    return this.getEventAccessModel(event.data);
  };

  private getEventAccessModel = (accessRequest: EventEntity): EventAccessModel => new EventAccessModel(
    accessRequest.id,
    accessRequest.name,
    accessRequest.authorid,
    accessRequest.description,
    accessRequest.isactive,
    accessRequest.date,
    accessRequest.ispublic
  );

  private getEntity = (accessRequest: CreateEventAccessRequest | UpdateEventAccessRequest) => {
    const eventEntity = new EventEntity(accessRequest.name, accessRequest.authorId, accessRequest.description, true, accessRequest.date, accessRequest.isPublic);
    if (accessRequest instanceof UpdateEventAccessRequest) {
      eventEntity.id = accessRequest.id
    }
    return eventEntity
  };

}
