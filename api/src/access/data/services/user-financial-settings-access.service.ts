import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { BaseAccessService, DbContextService } from '.';
import { TableEnum } from '../../../utility/enums';
import {
  IUserFinancialSettingsAccessService,
  UpsertUserFinancialSettingsAccessRequest,
  UserFinancialSettingsAccessModel,
} from '../../contract/financial-settings';
import { UserFinancialSettingsEntity } from '../entities/user-financial-settings.entity';

@Injectable()
export class UserFinancialSettingsAccessService extends BaseAccessService implements IUserFinancialSettingsAccessService {
  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  public getByUserId = async (userId: number): Promise<UserFinancialSettingsAccessModel | null> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.UserFinancialSettings)
      .select('*')
      .eq('userid', userId)
      .maybeSingle<UserFinancialSettingsEntity>();

    if (error) throw new InternalServerErrorException(error.message);
    return data ? this.mapEntityToModel(data) : null;
  };

  public upsert = async (request: UpsertUserFinancialSettingsAccessRequest): Promise<UserFinancialSettingsAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.UserFinancialSettings)
      .upsert({
        userid: request.userId,
        currencyid: request.currencyId,
        monthlynetincome: request.monthlyNetIncome,
        monthlyessentialexpense: request.monthlyEssentialExpense,
        cushiongreenmonths: request.cushionGreenMonths,
        cushionyellowmonths: request.cushionYellowMonths,
        savingsgreenpercentage: request.savingsGreenPercentage,
        savingsyellowpercentage: request.savingsYellowPercentage,
        debtgreenpercentage: request.debtGreenPercentage,
        debtyellowpercentage: request.debtYellowPercentage,
        dateupdated: new Date().toISOString(),
      }, { onConflict: 'userid' })
      .select()
      .single<UserFinancialSettingsEntity>();

    if (error) throw new InternalServerErrorException(error.message);
    return this.mapEntityToModel(data);
  };

  // DECIMAL y BIGINT pueden llegar como string desde PostgREST
  private mapEntityToModel = (entity: UserFinancialSettingsEntity): UserFinancialSettingsAccessModel =>
    new UserFinancialSettingsAccessModel(
      entity.userid,
      entity.currencyid,
      entity.monthlynetincome === null ? null : Number(entity.monthlynetincome),
      entity.monthlyessentialexpense === null ? null : Number(entity.monthlyessentialexpense),
      Number(entity.cushiongreenmonths),
      Number(entity.cushionyellowmonths),
      Number(entity.savingsgreenpercentage),
      Number(entity.savingsyellowpercentage),
      Number(entity.debtgreenpercentage),
      Number(entity.debtyellowpercentage),
    );
}
