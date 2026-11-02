import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Inject,
} from '@nestjs/common';
import { CurrentUserService } from '../services/current-user.service';
import { PrivateEndpointGuard } from '../guards/private-endpoint.guard';
import { AccountManagerService } from '../../manager/services/account-manager.service';
import { ACCOUNT_TOKENS } from '../../utility/constants/injection-tokens.const';
import {
  AccountModel,
  AccountBalanceSnapshotModel,
  AccountBalanceItemRequest,
  CreateAccountRequest,
  UpdateAccountRequest,
  UpsertAccountBalancesRequest,
} from '../../manager/models/accounts';
import {
  CreateAccountApiRequest,
  UpdateAccountApiRequest,
  UpsertAccountBalancesApiRequest,
} from '../models/accounts';
import { MessageModel } from '../models/message.model';

@Controller('accounts')
@UseGuards(PrivateEndpointGuard)
export class AccountsController {
  constructor(
    private readonly currentUserService: CurrentUserService,

    @Inject(ACCOUNT_TOKENS.MANAGER_SERVICE)
    private readonly accountManagerService: AccountManagerService,
  ) {}

  // ==================== BALANCE SNAPSHOTS ====================
  // Declaradas antes de ':id' para que "balances" no se tome como un id

  @Get('balances')
  async getBalances(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<AccountBalanceSnapshotModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.accountManagerService.getBalances(userId, from || null, to || null);
  }

  @Put('balances')
  async upsertBalances(@Body() apiRequest: UpsertAccountBalancesApiRequest): Promise<AccountBalanceSnapshotModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    const request = new UpsertAccountBalancesRequest(
      userId,
      apiRequest.snapshotDate,
      (apiRequest.balances ?? []).map(b => new AccountBalanceItemRequest(+b.accountId, +b.balance)),
    );
    return await this.accountManagerService.upsertBalances(request);
  }

  // ==================== ACCOUNTS ====================

  @Get()
  async getAllAccounts(): Promise<AccountModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.accountManagerService.getAllAccounts(userId);
  }

  @Get(':id')
  async getAccountById(@Param('id', ParseIntPipe) id: number): Promise<AccountModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.accountManagerService.getAccountById(id, userId);
  }

  @Post()
  async createAccount(@Body() apiRequest: CreateAccountApiRequest): Promise<AccountModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    const request = new CreateAccountRequest(
      userId,
      +apiRequest.institutionId,
      +apiRequest.currencyId,
      apiRequest.name,
      +apiRequest.type,
      apiRequest.notes ?? null,
    );
    return await this.accountManagerService.createAccount(request);
  }

  @Put(':id')
  async updateAccount(
    @Param('id', ParseIntPipe) id: number,
    @Body() apiRequest: UpdateAccountApiRequest,
  ): Promise<AccountModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    const request = new UpdateAccountRequest(
      id,
      userId,
      +apiRequest.institutionId,
      +apiRequest.currencyId,
      apiRequest.name,
      +apiRequest.type,
      this.toBoolean(apiRequest.isActive),
      apiRequest.notes ?? null,
    );
    return await this.accountManagerService.updateAccount(request);
  }

  @Delete(':id')
  async deleteAccount(@Param('id', ParseIntPipe) id: number): Promise<MessageModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    await this.accountManagerService.deleteAccount(id, userId);
    return new MessageModel('Account deleted successfully');
  }

  // Sin ValidationPipe global el body puede traer "false" como string
  private toBoolean = (value: unknown): boolean => value === true || value === 'true';
}
