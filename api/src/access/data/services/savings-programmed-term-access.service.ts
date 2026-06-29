import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { TableEnum } from '../../../utility/enums';
import { BaseAccessService, DbContextService } from '.';
import { ISavingsProgrammedTermAccessService, SavingsProgrammedTermAccessModel } from '../../contract/savings';
import { SavingsProgrammedTermEntity } from '../entities/savings-programmed-term.entity';

@Injectable()
export class SavingsProgrammedTermAccessService extends BaseAccessService implements ISavingsProgrammedTermAccessService {
  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  public getAll = async (): Promise<SavingsProgrammedTermAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.SavingsProgrammedTerms)
      .select('*')
      .order('term_months', { ascending: true });

    if (error) throw new InternalServerErrorException(error.message);
    return (data ?? []).map((e: SavingsProgrammedTermEntity) =>
      new SavingsProgrammedTermAccessModel(e.id, e.term_months, e.annual_rate_percentage),
    );
  };
}
