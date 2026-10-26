import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PostgrestError } from '@supabase/supabase-js';
import { BaseAccessService, DbContextService } from '.';
import { DatabaseColumns, TableEnum } from '../../../utility/enums';
import {
  IFinancialInstitutionAccessService,
  FinancialInstitutionAccessModel,
  CreateFinancialInstitutionAccessRequest,
  UpdateFinancialInstitutionAccessRequest,
} from '../../contract/financial-institutions';
import { FinancialInstitutionEntity } from '../entities/financial-institution.entity';

@Injectable()
export class FinancialInstitutionAccessService extends BaseAccessService implements IFinancialInstitutionAccessService {
  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  public create = async (request: CreateFinancialInstitutionAccessRequest): Promise<FinancialInstitutionAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.FinancialInstitutions)
      .insert({
        userid: request.userId,
        name: request.name,
        isother: false,
        type: request.type,
      })
      .select()
      .single<FinancialInstitutionEntity>();

    if (error) throw this.mapWriteError(error);
    return this.mapEntityToModel(data);
  };

  // Visible para el usuario: entidad del sistema (userid NULL) o propia
  public getById = async (id: number, userId: number): Promise<FinancialInstitutionAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.FinancialInstitutions)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.EntityId, id)
      .or(`${DatabaseColumns.UserId}.is.null,${DatabaseColumns.UserId}.eq.${userId}`)
      .single<FinancialInstitutionEntity>();

    if (error) {
      if (error.code === 'PGRST116') throw new NotFoundException(`Financial institution with id ${id} not found`);
      throw new InternalServerErrorException(error.message);
    }

    return this.mapEntityToModel(data);
  };

  // Entidades del sistema (userid NULL) + las propias del usuario
  public getAll = async (userId: number): Promise<FinancialInstitutionAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.FinancialInstitutions)
      .select(DatabaseColumns.All)
      .or(`${DatabaseColumns.UserId}.is.null,${DatabaseColumns.UserId}.eq.${userId}`)
      .order(DatabaseColumns.EntityId, { ascending: true });

    if (error) throw new InternalServerErrorException(error.message);
    return (data as FinancialInstitutionEntity[] ?? []).map(this.mapEntityToModel);
  };

  // Solo entidades propias: las del sistema no matchean el filtro por userid
  public update = async (request: UpdateFinancialInstitutionAccessRequest): Promise<FinancialInstitutionAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.FinancialInstitutions)
      .update({
        name: request.name,
        type: request.type,
      })
      .eq(DatabaseColumns.EntityId, request.id)
      .eq(DatabaseColumns.UserId, request.userId)
      .select()
      .single<FinancialInstitutionEntity>();

    if (error) {
      if (error.code === 'PGRST116') throw new NotFoundException(`Financial institution with id ${request.id} not found`);
      throw this.mapWriteError(error);
    }

    return this.mapEntityToModel(data);
  };

  // Solo entidades propias; si está en uso (FK desde loans/savings/accounts) responde Conflict
  public delete = async (id: number, userId: number): Promise<void> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.FinancialInstitutions)
      .delete()
      .eq(DatabaseColumns.EntityId, id)
      .eq(DatabaseColumns.UserId, userId)
      .select(DatabaseColumns.EntityId);

    if (error) throw this.mapWriteError(error);
    if (!data?.length) throw new NotFoundException(`Financial institution with id ${id} not found`);
  };

  private mapWriteError = (error: PostgrestError): Error => {
    if (error.code === '23505') return new ConflictException('A financial institution with this name already exists');
    if (error.code === '23503') return new ConflictException('The financial institution is in use and cannot be deleted');
    return new InternalServerErrorException(error.message);
  };

  private mapEntityToModel = (entity: FinancialInstitutionEntity): FinancialInstitutionAccessModel =>
    new FinancialInstitutionAccessModel(
      entity.id,
      entity.userid,
      entity.name,
      entity.isother,
      entity.type,
    );
}
