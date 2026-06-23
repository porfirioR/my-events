import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { BaseAccessService, DbContextService } from '.';
import { TableEnum } from '../../../utility/enums';
import { LoanEntityTermAccessModel } from '../../contract/loans';
import { LoanEntityTermEntity } from '../entities/loan-entity-term.entity';

@Injectable()
export class LoanEntityTermAccessService extends BaseAccessService {
  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  public getAll = async (): Promise<LoanEntityTermAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.LoanEntityTerms)
      .select('*')
      .order('loanentityid', { ascending: true })
      .order('termmonths', { ascending: true });

    if (error) throw new InternalServerErrorException(error.message);
    return (data as LoanEntityTermEntity[] ?? []).map(e =>
      new LoanEntityTermAccessModel(e.id, e.loanentityid, e.termmonths, e.annualratepercentage)
    );
  };

  public getByEntityId = async (entityId: number): Promise<LoanEntityTermAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.LoanEntityTerms)
      .select('*')
      .eq('loanentityid', entityId)
      .order('termmonths', { ascending: true });

    if (error) throw new InternalServerErrorException(error.message);
    return (data as LoanEntityTermEntity[] ?? []).map(e =>
      new LoanEntityTermAccessModel(e.id, e.loanentityid, e.termmonths, e.annualratepercentage)
    );
  };
}
