import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { BaseAccessService, DbContextService } from '.';
import { DatabaseColumns, TableEnum } from '../../../utility/enums';
import {
  IImportedMovementLinkAccessService,
  ImportedMovementLinkAccessModel,
  InstallmentLinkRequest,
} from '../../contract/mymoney';
import { ImportedMovementLinkEntity } from '../entities/imported-movement-link.entity';

const PAGE_SIZE = 1000;

@Injectable()
export class ImportedMovementLinkAccessService extends BaseAccessService implements IImportedMovementLinkAccessService {
  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  public getAll = async (userId: number): Promise<ImportedMovementLinkAccessModel[]> => {
    const result: ImportedMovementLinkAccessModel[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await this.dbContext
        .from(TableEnum.ImportedMovementLinks)
        .select('id, importedmovementid, savingsinstallmentid, loaninstallmentid')
        .eq(DatabaseColumns.UserId, userId)
        .order(DatabaseColumns.EntityId, { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw new InternalServerErrorException(error.message);
      const rows = (data ?? []) as ImportedMovementLinkEntity[];
      result.push(...rows.map(entity => new ImportedMovementLinkAccessModel(
        entity.id,
        entity.importedmovementid,
        entity.savingsinstallmentid,
        entity.loaninstallmentid,
      )));
      if (rows.length < PAGE_SIZE) return result;
    }
  };

  public replaceForMovement = async (userId: number, importedMovementId: number, links: InstallmentLinkRequest[]): Promise<void> => {
    const { error: deleteError } = await this.dbContext
      .from(TableEnum.ImportedMovementLinks)
      .delete()
      .eq(DatabaseColumns.UserId, userId)
      .eq('importedmovementid', importedMovementId);

    if (deleteError) throw new InternalServerErrorException(deleteError.message);
    if (!links.length) return;

    const { error } = await this.dbContext
      .from(TableEnum.ImportedMovementLinks)
      .insert(links.map(link => ({
        userid: userId,
        importedmovementid: importedMovementId,
        savingsinstallmentid: link.savingsInstallmentId,
        loaninstallmentid: link.loanInstallmentId,
      })));

    if (error) throw new InternalServerErrorException(error.message);
  };
}
