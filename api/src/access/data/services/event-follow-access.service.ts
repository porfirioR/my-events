import { Injectable } from '@nestjs/common';
import { TableEnum, DatabaseColumns } from '../../../utility/enums';
import { EventAccessModel } from '../../contract/events/event-access-model';
import { EventFollowRequest } from '../../contract/event-follows/event-follow-request';
import { BaseAccessService, DbContextService } from '.';
import { EventEntity, EventFollowEntity } from '../entities';

@Injectable()
export class EventFollowAccessService extends BaseAccessService {

  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  public getEventFollows = async (userId: number): Promise<EventAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.EventFollows)
      .select(
        `userid,
        events (
          id,
          name,
          authorid,
          description,
          isactive,
          date,
          ispublic
        )`
      )
      .eq(DatabaseColumns.UserId, userId);
    if (error) throw error;
    const events = data.flatMap(x => x.events.filter(x => x.isactive));
    return events.map(this.getEventAccessModel);
  };

  public createEventFollow = async (accessRequest: EventFollowRequest): Promise<boolean> => {
    const entity = this.getEntity(accessRequest)
    const event  = await this.dbContext
      .from(TableEnum.EventFollows)
      .insert(entity);
    if (event.error) throw new Error(event.error.message);
    return true;
  };

  public deleteEventFollow = async (accessRequest: EventFollowRequest): Promise<boolean> => {
    const eventFollow = await this.dbContext
      .from(TableEnum.EventFollows)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.UserId, accessRequest.userId)
      .eq(DatabaseColumns.EventId, accessRequest.eventId)
      .single();
    if (eventFollow.error) throw new Error(eventFollow.error.message);

    const deleteEventFollow = await this.dbContext
      .from(TableEnum.EventFollows)
      .delete()
      .eq(DatabaseColumns.EntityId, eventFollow.data.Id);
    if (deleteEventFollow.error) throw new Error(deleteEventFollow.error.message);
    return true;
  };
  
  public checkExistEventFollows = async (accessRequest: EventFollowRequest): Promise<boolean> => {
    const { count, error } = await this.dbContext
      .from(TableEnum.EventFollows)
      .select(DatabaseColumns.All, {count: 'exact', head: true})
      .eq(DatabaseColumns.UserId, accessRequest.userId)
      .eq(DatabaseColumns.EventId, accessRequest.eventId);
    if (error) throw error;
    return count > 0;
  };

  private getEventAccessModel = (x: EventEntity): EventAccessModel => new EventAccessModel(
    x.id,
    x.name,
    x.authorid,
    x.description,
    x.isactive,
    x.date,
    x.ispublic
  );

  private getEntity = (accessRequest: EventFollowRequest): EventFollowEntity => new EventFollowEntity(accessRequest.eventId, accessRequest.userId)
}
