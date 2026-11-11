import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { MyMoneyExportHelper } from '../../utility/helpers/mymoney-export.helper';
import { MyMoneyCategoryMappingHelper } from '../../utility/helpers/mymoney-category-mapping.helper';
import { ACCOUNT_TOKENS, IMPORT_TOKENS, LOAN_TOKENS, SAVINGS_TOKENS } from '../../utility/constants/injection-tokens.const';
import { MyMoneyCategoryKind, MyMoneyMovementTypeEnum } from '../../utility/enums';
import {
  CreateMyMoneyCategoryMappingAccessRequest,
  IMyMoneyCategoryMappingAccessService,
  IMyMoneyDescriptionRuleAccessService,
  MyMoneyCategoryMappingAccessModel,
  MyMoneyDescriptionRuleAccessModel,
  MyMoneyLinkTarget,
  UpdateMyMoneyCategoryMappingAccessRequest,
  UpsertMyMoneyDescriptionRuleAccessRequest,
} from '../../access/contract/mymoney';
import { IAccountAccessService } from '../../access/contract/accounts';
import { ISavingsGoalAccessService } from '../../access/contract/savings';
import { ILoanAccessService } from '../../access/contract/loans';
import {
  MyMoneyCategoryMappingModel,
  MyMoneyCategorySyncModel,
  MyMoneyDescriptionRuleModel,
  MyMoneyPreviewModel,
  UpdateMyMoneyCategoryMappingRequest,
  UpsertMyMoneyDescriptionRuleRequest,
} from '../models/imports';

// Importación de movimientos desde MyMoney (epic #213): lectura del archivo (#230) y mapeo de
// categorías y descripciones (#231). El guardado idempotente de movimientos llega en #232.
@Injectable()
export class ImportManagerService {
  constructor(
    @Inject(IMPORT_TOKENS.CATEGORY_MAPPING_ACCESS_SERVICE)
    private readonly categoryMappingAccessService: IMyMoneyCategoryMappingAccessService,
    @Inject(IMPORT_TOKENS.DESCRIPTION_RULE_ACCESS_SERVICE)
    private readonly descriptionRuleAccessService: IMyMoneyDescriptionRuleAccessService,
    @Inject(ACCOUNT_TOKENS.ACCOUNT_ACCESS_SERVICE)
    private readonly accountAccessService: IAccountAccessService,
    @Inject(SAVINGS_TOKENS.GOAL_ACCESS_SERVICE)
    private readonly savingsGoalAccessService: ISavingsGoalAccessService,
    @Inject(LOAN_TOKENS.LOAN_ACCESS_SERVICE)
    private readonly loanAccessService: ILoanAccessService,
  ) {}

  previewMyMoney(fileName: string, content: Buffer): MyMoneyPreviewModel {
    const result = MyMoneyExportHelper.parseText(content.toString('utf8'));
    return new MyMoneyPreviewModel(
      fileName,
      result.valid,
      result.errors,
      result.warnings,
      result.valid ? MyMoneyExportHelper.summarize(result.data) : null,
    );
  }

  // ==================== CATEGORÍAS ====================

  public getCategoryMappings = async (userId: number): Promise<MyMoneyCategoryMappingModel[]> => {
    const mappings = await this.categoryMappingAccessService.getAll(userId);
    return mappings.map(this.mapCategoryToModel);
  };

  // Agrega las categorías nuevas del export (con su clasificación por defecto) y actualiza los nombres
  // que cambiaron en MyMoney. Un archivo inválido no guarda nada.
  public syncCategoryMappings = async (userId: number, fileName: string, content: Buffer): Promise<MyMoneyCategorySyncModel> => {
    const result = MyMoneyExportHelper.parseText(content.toString('utf8'));
    if (!result.valid) {
      return new MyMoneyCategorySyncModel(fileName, false, result.errors, 0, 0, await this.getCategoryMappings(userId));
    }

    const existing = await this.categoryMappingAccessService.getAll(userId);
    const plan = MyMoneyCategoryMappingHelper.planSync(existing, result.data.categories);

    await this.categoryMappingAccessService.createMany(plan.toCreate.map(mapping =>
      new CreateMyMoneyCategoryMappingAccessRequest(
        userId,
        mapping.categoryExternalId,
        mapping.categoryName,
        mapping.movementType,
        mapping.kind,
        mapping.isEssential,
        mapping.isExtraordinary,
        mapping.needsReview,
      )));
    await Promise.all(plan.toRename.map(rename =>
      this.categoryMappingAccessService.rename(rename.id, userId, rename.categoryName)));

    return new MyMoneyCategorySyncModel(
      fileName,
      true,
      [],
      plan.toCreate.length,
      plan.toRename.length,
      await this.getCategoryMappings(userId),
    );
  };

  // Guardar la clasificación la saca de "a revisar". El destino (cuenta, ahorro o préstamo) solo se
  // guarda en transferencias; esencial y extraordinario solo donde tienen sentido.
  public updateCategoryMapping = async (request: UpdateMyMoneyCategoryMappingRequest): Promise<MyMoneyCategoryMappingModel> => {
    const current = await this.categoryMappingAccessService.getById(request.id, request.userId);
    const kind = request.kind as MyMoneyCategoryKind;
    if (!MyMoneyCategoryMappingHelper.isKindAllowed(current.movementType as MyMoneyMovementTypeEnum, kind)) {
      throw new BadRequestException('The kind is not valid for this category type');
    }

    const classification = MyMoneyCategoryMappingHelper.normalize(kind, request.isEssential, request.isExtraordinary);
    const target = kind === MyMoneyCategoryKind.Transfer
      ? await this.validateTarget(request.userId, request.accountId, request.savingsGoalId, request.loanId, false)
      : new MyMoneyLinkTarget(null, null, null);

    const mapping = await this.categoryMappingAccessService.update(new UpdateMyMoneyCategoryMappingAccessRequest(
      request.id,
      request.userId,
      classification.kind,
      classification.isEssential,
      classification.isExtraordinary,
      target,
    ));
    return this.mapCategoryToModel(mapping);
  };

  // ==================== DESCRIPCIONES ====================

  public getDescriptionRules = async (userId: number): Promise<MyMoneyDescriptionRuleModel[]> => {
    const rules = await this.descriptionRuleAccessService.getAll(userId);
    return rules.map(this.mapRuleToModel);
  };

  public upsertDescriptionRule = async (request: UpsertMyMoneyDescriptionRuleRequest): Promise<MyMoneyDescriptionRuleModel> => {
    const pattern = request.pattern.trim().replace(/\s+/g, ' ');
    if (!pattern) throw new BadRequestException('Pattern is required');

    const target = await this.validateTarget(request.userId, request.accountId, request.savingsGoalId, request.loanId, true);
    const accessRequest = new UpsertMyMoneyDescriptionRuleAccessRequest(request.id, request.userId, pattern, target);
    const rule = request.id === null
      ? await this.descriptionRuleAccessService.create(accessRequest)
      : await this.descriptionRuleAccessService.update(accessRequest);
    return this.mapRuleToModel(rule);
  };

  public deleteDescriptionRule = async (id: number, userId: number): Promise<void> => {
    await this.descriptionRuleAccessService.delete(id, userId);
  };

  // A lo sumo un destino (exactamente uno si required) y tiene que ser del usuario: getById responde
  // NotFound si la cuenta, el ahorro o el préstamo no existe o es de otro usuario.
  private validateTarget = async (
    userId: number,
    accountId: number | null,
    savingsGoalId: number | null,
    loanId: number | null,
    required: boolean,
  ): Promise<MyMoneyLinkTarget> => {
    const count = [accountId, savingsGoalId, loanId].filter(id => id !== null).length;
    if (count > 1) throw new BadRequestException('Only one of account, savings goal or loan can be linked');
    if (required && count === 0) throw new BadRequestException('An account, savings goal or loan is required');

    if (accountId !== null) await this.accountAccessService.getById(accountId, userId);
    if (savingsGoalId !== null) await this.savingsGoalAccessService.getById(savingsGoalId, userId);
    if (loanId !== null) await this.loanAccessService.getById(loanId, userId);
    return new MyMoneyLinkTarget(accountId, savingsGoalId, loanId);
  };

  private mapCategoryToModel = (mapping: MyMoneyCategoryMappingAccessModel): MyMoneyCategoryMappingModel =>
    new MyMoneyCategoryMappingModel(
      mapping.id,
      mapping.categoryExternalId,
      mapping.categoryName,
      mapping.movementType,
      mapping.kind,
      mapping.isEssential,
      mapping.isExtraordinary,
      mapping.target.accountId,
      mapping.target.savingsGoalId,
      mapping.target.loanId,
      mapping.needsReview,
    );

  private mapRuleToModel = (rule: MyMoneyDescriptionRuleAccessModel): MyMoneyDescriptionRuleModel =>
    new MyMoneyDescriptionRuleModel(
      rule.id,
      rule.pattern,
      rule.target.accountId,
      rule.target.savingsGoalId,
      rule.target.loanId,
    );
}
