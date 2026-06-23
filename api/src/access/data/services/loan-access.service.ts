import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { BaseAccessService, DbContextService } from '.';
import { DatabaseColumns, TableEnum } from '../../../utility/enums';
import {
  ILoanAccessService,
  LoanAccessModel,
  CreateLoanAccessRequest,
  UpdateLoanAccessRequest,
} from '../../contract/loans';
import { LoanEntity } from '../entities/loan.entity';

@Injectable()
export class LoanAccessService extends BaseAccessService implements ILoanAccessService {
  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  public create = async (request: CreateLoanAccessRequest): Promise<LoanAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Loans)
      .insert({
        userid: request.userId,
        currencyid: request.currencyId,
        loantypeid: request.loanTypeId,
        loanentityid: request.loanEntityId,
        lendercustomname: request.lenderCustomName,
        name: request.name,
        description: request.description,
        principalamount: request.principalAmount,
        annualratepercentage: request.annualRatePercentage,
        numberofinstallments: request.numberOfInstallments,
        calculatedinstallmentamount: request.calculatedInstallmentAmount,
        calculatedtotalinterest: request.calculatedTotalInterest,
        calculatedtotalamount: request.calculatedTotalAmount,
        actualinstallmentamount: request.actualInstallmentAmount,
        actualtotalamount: request.actualTotalAmount,
        currentbalance: request.currentBalance,
        totalpaid: 0,
        amortizationtype: request.amortizationType,
        startdate: request.startDate.toISOString().split('T')[0],
        expectedenddate: request.expectedEndDate ? request.expectedEndDate.toISOString().split('T')[0] : null,
      })
      .select()
      .single<LoanEntity>();

    if (error) throw new InternalServerErrorException(error.message);
    return this.mapEntityToModel(data);
  };

  public getById = async (id: number, userId: number): Promise<LoanAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Loans)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.EntityId, id)
      .eq(DatabaseColumns.UserId, userId)
      .single<LoanEntity>();

    if (error) {
      if (error.code === 'PGRST116') throw new NotFoundException(`Loan with id ${id} not found`);
      throw new InternalServerErrorException(error.message);
    }

    const paidCount = await this.getPaidInstallmentsCount(id);
    return this.mapEntityToModel(data, paidCount);
  };

  public getAll = async (userId: number): Promise<LoanAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Loans)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.UserId, userId)
      .order(DatabaseColumns.DateCreated, { ascending: false });

    if (error) throw new InternalServerErrorException(error.message);
    if (!data?.length) return [];

    const loanIds = data.map(l => l.id);
    const paidCountMap = await this.getPaidInstallmentsCountMap(loanIds);

    return data.map(entity => this.mapEntityToModel(entity, paidCountMap.get(entity.id) ?? 0));
  };

  public update = async (request: UpdateLoanAccessRequest): Promise<LoanAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Loans)
      .update({
        name: request.name,
        description: request.description,
        loantypeid: request.loanTypeId,
        statusid: request.statusId,
        dateupdated: new Date().toISOString(),
      })
      .eq(DatabaseColumns.EntityId, request.id)
      .eq(DatabaseColumns.UserId, request.userId)
      .select()
      .single<LoanEntity>();

    if (error) throw new InternalServerErrorException(error.message);
    return this.mapEntityToModel(data);
  };

  public updateBalance = async (id: number, userId: number, currentBalance: number, totalPaid: number): Promise<LoanAccessModel> => {
    const updateData: any = {
      currentbalance: currentBalance,
      totalpaid: totalPaid,
      dateupdated: new Date().toISOString(),
    };
    if (currentBalance <= 0) {
      updateData.statusid = 2;
      updateData.completeddate = new Date().toISOString();
    }

    const { data, error } = await this.dbContext
      .from(TableEnum.Loans)
      .update(updateData)
      .eq(DatabaseColumns.EntityId, id)
      .eq(DatabaseColumns.UserId, userId)
      .select()
      .single<LoanEntity>();

    if (error) throw new InternalServerErrorException(error.message);
    return this.mapEntityToModel(data);
  };

  public markAsCompleted = async (id: number, userId: number): Promise<LoanAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Loans)
      .update({ statusid: 2, completeddate: new Date().toISOString(), dateupdated: new Date().toISOString() })
      .eq(DatabaseColumns.EntityId, id)
      .eq(DatabaseColumns.UserId, userId)
      .select()
      .single<LoanEntity>();

    if (error) throw new InternalServerErrorException(error.message);
    return this.mapEntityToModel(data);
  };

  public delete = async (id: number, userId: number): Promise<void> => {
    const { error } = await this.dbContext
      .from(TableEnum.Loans)
      .delete()
      .eq(DatabaseColumns.EntityId, id)
      .eq(DatabaseColumns.UserId, userId);

    if (error) throw new InternalServerErrorException(error.message);
  };

  private getPaidInstallmentsCount = async (loanId: number): Promise<number> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.LoanInstallments)
      .select('id')
      .eq('loanid', loanId)
      .eq('statusid', 2);

    if (error) return 0;
    return data?.length ?? 0;
  };

  private getPaidInstallmentsCountMap = async (loanIds: number[]): Promise<Map<number, number>> => {
    const { data } = await this.dbContext
      .from(TableEnum.LoanInstallments)
      .select('loanid')
      .in('loanid', loanIds)
      .eq('statusid', 2);

    const map = new Map<number, number>();
    if (data) {
      for (const row of data) {
        map.set(row.loanid, (map.get(row.loanid) ?? 0) + 1);
      }
    }
    return map;
  };

  private mapEntityToModel = (entity: LoanEntity, paidInstallmentsCount = 0): LoanAccessModel =>
    new LoanAccessModel(
      entity.id,
      entity.userid,
      entity.currencyid,
      entity.loantypeid,
      entity.loanentityid,
      entity.lendercustomname,
      entity.name,
      entity.description,
      entity.principalamount,
      entity.annualratepercentage,
      entity.numberofinstallments,
      entity.calculatedinstallmentamount,
      entity.actualinstallmentamount,
      entity.calculatedtotalinterest,
      entity.calculatedtotalamount,
      entity.actualtotalamount,
      entity.currentbalance,
      entity.totalpaid,
      entity.amortizationtype,
      entity.statusid,
      new Date(entity.startdate),
      entity.expectedenddate ? new Date(entity.expectedenddate) : null,
      entity.completeddate ? new Date(entity.completeddate) : null,
      paidInstallmentsCount,
    );
}
