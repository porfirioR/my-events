import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { BaseAccessService, DbContextService } from '.';
import { DatabaseColumns, TableEnum } from '../../../utility/enums';
import {
  CreateMyMoneyCategoryMappingAccessRequest,
  IMyMoneyCategoryMappingAccessService,
  MyMoneyCategoryMappingAccessModel,
  MyMoneyLinkTarget,
  UpdateMyMoneyCategoryMappingAccessRequest,
} from '../../contract/mymoney';
import { MyMoneyCategoryMappingEntity } from '../entities/mymoney-category-mapping.entity';

@Injectable()
export class MyMoneyCategoryMappingAccessService extends BaseAccessService implements IMyMoneyCategoryMappingAccessService {
  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  public getAll = async (userId: number): Promise<MyMoneyCategoryMappingAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.MyMoneyCategoryMappings)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.UserId, userId)
      .order(DatabaseColumns.MovementType, { ascending: true })
      .order('categoryname', { ascending: true });

    if (error) throw new InternalServerErrorException(error.message);
    return (data as MyMoneyCategoryMappingEntity[] ?? []).map(this.mapEntityToModel);
  };

  public getById = async (id: number, userId: number): Promise<MyMoneyCategoryMappingAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.MyMoneyCategoryMappings)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.EntityId, id)
      .eq(DatabaseColumns.UserId, userId)
      .maybeSingle<MyMoneyCategoryMappingEntity>();

    if (error) throw new InternalServerErrorException(error.message);
    if (!data) throw new NotFoundException(`Category mapping with id ${id} not found`);
    return this.mapEntityToModel(data);
  };

  // Si dos sincronizaciones corren a la vez, la segunda ignora las categorías que ya insertó la primera
  public createMany = async (requests: CreateMyMoneyCategoryMappingAccessRequest[]): Promise<void> => {
    if (!requests.length) return;

    const { error } = await this.dbContext
      .from(TableEnum.MyMoneyCategoryMappings)
      .upsert(
        requests.map(request => ({
          userid: request.userId,
          categoryexternalid: request.categoryExternalId,
          categoryname: request.categoryName,
          movementtype: request.movementType,
          kind: request.kind,
          isessential: request.isEssential,
          isextraordinary: request.isExtraordinary,
          needsreview: request.needsReview,
        })),
        { onConflict: 'userid,categoryexternalid', ignoreDuplicates: true },
      );

    if (error) throw new InternalServerErrorException(error.message);
  };

  public rename = async (id: number, userId: number, categoryName: string): Promise<void> => {
    const { error } = await this.dbContext
      .from(TableEnum.MyMoneyCategoryMappings)
      .update({ categoryname: categoryName, dateupdated: new Date().toISOString() })
      .eq(DatabaseColumns.EntityId, id)
      .eq(DatabaseColumns.UserId, userId);

    if (error) throw new InternalServerErrorException(error.message);
  };

  public update = async (request: UpdateMyMoneyCategoryMappingAccessRequest): Promise<MyMoneyCategoryMappingAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.MyMoneyCategoryMappings)
      .update({
        kind: request.kind,
        isessential: request.isEssential,
        isextraordinary: request.isExtraordinary,
        accountid: request.target.accountId,
        savingsgoalid: request.target.savingsGoalId,
        loanid: request.target.loanId,
        needsreview: false,
        dateupdated: new Date().toISOString(),
      })
      .eq(DatabaseColumns.EntityId, request.id)
      .eq(DatabaseColumns.UserId, request.userId)
      .select()
      .maybeSingle<MyMoneyCategoryMappingEntity>();

    if (error) throw new InternalServerErrorException(error.message);
    if (!data) throw new NotFoundException(`Category mapping with id ${request.id} not found`);
    return this.mapEntityToModel(data);
  };

  private mapEntityToModel = (entity: MyMoneyCategoryMappingEntity): MyMoneyCategoryMappingAccessModel =>
    new MyMoneyCategoryMappingAccessModel(
      entity.id,
      entity.userid,
      entity.categoryexternalid,
      entity.categoryname,
      entity.movementtype,
      entity.kind,
      entity.isessential,
      entity.isextraordinary,
      new MyMoneyLinkTarget(entity.accountid, entity.savingsgoalid, entity.loanid),
      entity.needsreview,
    );
}
