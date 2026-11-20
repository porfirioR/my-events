import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { BaseAccessService, DbContextService } from '.';
import { DatabaseColumns, TableEnum } from '../../../utility/enums';
import {
  IImportedMovementAccessService,
  ImportedMovementAccessModel,
  UpsertImportedMovementAccessRequest,
} from '../../contract/mymoney';
import { ImportedMovementEntity } from '../entities/imported-movement.entity';

// Supabase devuelve a lo sumo 1000 filas por consulta; también se escribe por lotes para no mandar
// un pedido enorme con dos años de movimientos
const PAGE_SIZE = 1000;
const WRITE_BATCH_SIZE = 500;

@Injectable()
export class ImportedMovementAccessService extends BaseAccessService implements IImportedMovementAccessService {
  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  public getAll = async (userId: number): Promise<ImportedMovementAccessModel[]> => {
    const result: ImportedMovementAccessModel[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await this.dbContext
        .from(TableEnum.ImportedMovements)
        .select('id, externalid, categoryexternalid, movementdate, movementtype, amount, note')
        .eq(DatabaseColumns.UserId, userId)
        .order(DatabaseColumns.EntityId, { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw new InternalServerErrorException(error.message);
      const rows = (data ?? []) as ImportedMovementEntity[];
      result.push(...rows.map(this.mapEntityToModel));
      if (rows.length < PAGE_SIZE) return result;
    }
  };

  public upsertMany = async (requests: UpsertImportedMovementAccessRequest[]): Promise<void> => {
    const now = new Date().toISOString();
    for (const batch of this.chunk(requests)) {
      const { error } = await this.dbContext
        .from(TableEnum.ImportedMovements)
        .upsert(
          batch.map(request => ({
            userid: request.userId,
            externalid: request.externalId,
            categoryexternalid: request.categoryExternalId,
            movementdate: request.date,
            movementtype: request.movementType,
            amount: request.amount,
            note: request.note,
            dateupdated: now,
          })),
          { onConflict: 'userid,externalid' },
        );

      if (error) throw new InternalServerErrorException(error.message);
    }
  };

  public deleteMany = async (ids: number[], userId: number): Promise<void> => {
    for (const batch of this.chunk(ids)) {
      const { error } = await this.dbContext
        .from(TableEnum.ImportedMovements)
        .delete()
        .in(DatabaseColumns.EntityId, batch)
        .eq(DatabaseColumns.UserId, userId);

      if (error) throw new InternalServerErrorException(error.message);
    }
  };

  private chunk = <T>(items: T[]): T[][] => {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += WRITE_BATCH_SIZE) {
      batches.push(items.slice(i, i + WRITE_BATCH_SIZE));
    }
    return batches;
  };

  private mapEntityToModel = (entity: ImportedMovementEntity): ImportedMovementAccessModel =>
    new ImportedMovementAccessModel(
      entity.id,
      entity.externalid,
      entity.categoryexternalid,
      entity.movementdate.slice(0, 10),
      entity.movementtype,
      Number(entity.amount),
      entity.note ?? '',
    );
}
