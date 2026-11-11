import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ViewChild, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { map, startWith } from 'rxjs';
import { FileUploadComponent } from '../file-upload/file-upload.component';
import { ConfirmDialogComponent, ConfirmDialogResult } from '../confirm-dialog/confirm-dialog.component';
import { useAccountsStore, useImportsStore, useLoansStore, useSavingsStore } from '../../store';
import {
  MyMoneyCategoryKind,
  MyMoneyCategoryKindLabels,
  MyMoneyCategoryMappingApiModel,
  MyMoneyDescriptionRuleApiModel,
  MyMoneyKindsByMovementType,
  MyMoneyLinkTargetApiModel,
  MyMoneyMappingMovementType,
} from '../../models/api/imports/mymoney-mapping-api.model';

const MAX_EXPORT_SIZE = 10 * 1024 * 1024;

interface TargetOption {
  value: string;
  label: string;
}

interface TargetGroup {
  label: string;
  options: TargetOption[];
}

interface MappingGroup {
  title: string;
  hint: string;
  items: MyMoneyCategoryMappingApiModel[];
}

// Clasificación de las categorías de MyMoney y patrones de descripción (#231).
// Las categorías se cargan desde un export; cada cambio de una fila se guarda en el momento.
@Component({
  selector: 'app-mymoney-category-mapping',
  templateUrl: './mymoney-category-mapping.component.html',
  imports: [CommonModule, RouterModule, TranslateModule, FileUploadComponent, ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyMoneyCategoryMappingComponent {
  @ViewChild(ConfirmDialogComponent) confirmDialog!: ConfirmDialogComponent;

  private translate = inject(TranslateService);
  private importsStore = useImportsStore();
  private accountsStore = useAccountsStore();
  private savingsStore = useSavingsStore();
  private loansStore = useLoansStore();
  private pendingCallback: ((result: ConfirmDialogResult) => void) | null = null;

  protected readonly maxSize = MAX_EXPORT_SIZE;
  protected readonly Kind = MyMoneyCategoryKind;
  protected readonly kindLabels = MyMoneyCategoryKindLabels;

  protected mappings = this.importsStore.categoryMappings;
  protected isLoading = this.importsStore.isCategoryMappingsLoading;
  protected hasError = computed(() => !!this.importsStore.categoryMappingsError());
  protected sync = this.importsStore.categorySync;
  protected isSyncing = this.importsStore.isCategorySyncLoading;
  protected rules = this.importsStore.descriptionRules;
  protected isRuleSaving = this.importsStore.isDescriptionRuleSaving;

  protected onlyPending = signal(false);
  protected pendingCount = computed(() => this.mappings().filter(mapping => mapping.needsReview).length);

  // Formulario de patrón: editingRuleId null = nuevo
  protected editingRuleId = signal<number | null>(null);
  protected rulePattern = signal('');
  protected ruleTarget = signal('');
  protected canSaveRule = computed(() => !!this.rulePattern().trim() && !!this.ruleTarget() && !this.isRuleSaving());

  private language = toSignal(
    this.translate.onLangChange.pipe(map(event => event.lang), startWith(this.translate.getCurrentLang())),
    { initialValue: this.translate.getCurrentLang() },
  );

  private categoryNames = computed<Record<string, string>>(() => {
    this.language();
    const names = this.translate.instant('myMoneyImport.categoryNames');
    return typeof names === 'object' && names ? names : {};
  });

  protected groups = computed<MappingGroup[]>(() => {
    const visible = this.mappings().filter(mapping => !this.onlyPending() || mapping.needsReview);
    return [
      {
        title: 'myMoneyMapping.expenseCategories',
        hint: 'myMoneyMapping.expenseHint',
        items: visible.filter(mapping => mapping.movementType === MyMoneyMappingMovementType.Expense),
      },
      {
        title: 'myMoneyMapping.incomeCategories',
        hint: 'myMoneyMapping.incomeHint',
        items: visible.filter(mapping => mapping.movementType === MyMoneyMappingMovementType.Income),
      },
    ];
  });

  protected targetGroups = computed<TargetGroup[]>(() => {
    this.language();
    return [
      {
        label: this.translate.instant('myMoneyMapping.targets.accounts'),
        options: this.accountsStore.accounts().map(account => ({ value: `account:${account.id}`, label: account.name })),
      },
      {
        label: this.translate.instant('myMoneyMapping.targets.savingsGoals'),
        options: this.savingsStore.goals().map(goal => ({ value: `goal:${goal.id}`, label: goal.name })),
      },
      {
        label: this.translate.instant('myMoneyMapping.targets.loans'),
        options: this.loansStore.loans().map(loan => ({ value: `loan:${loan.id}`, label: loan.name })),
      },
    ].filter(group => group.options.length > 0);
  });

  private targetLabels = computed(() =>
    new Map(this.targetGroups().flatMap(group => group.options.map(option => [option.value, `${option.label} · ${group.label}`]))));

  constructor() {
    this.importsStore.loadMappings();
    this.accountsStore.loadAccounts();
    this.savingsStore.loadGoals();
    this.loansStore.reloadLoans();
    inject(DestroyRef).onDestroy(() => this.importsStore.clearCategorySync());
  }

  protected categoryName = (name: string): string => this.categoryNames()[name] ?? name;

  protected kindsFor = (mapping: MyMoneyCategoryMappingApiModel): MyMoneyCategoryKind[] =>
    MyMoneyKindsByMovementType[mapping.movementType] ?? [];

  protected isSaving = (id: number): boolean => this.importsStore.savingMappingIds().includes(id);

  protected targetValue = (target: MyMoneyLinkTargetApiModel): string => {
    if (target.accountId) return `account:${target.accountId}`;
    if (target.savingsGoalId) return `goal:${target.savingsGoalId}`;
    if (target.loanId) return `loan:${target.loanId}`;
    return '';
  };

  protected targetLabel = (target: MyMoneyLinkTargetApiModel): string => {
    const value = this.targetValue(target);
    return this.targetLabels().get(value) ?? '—';
  };

  protected onFileSelected = (file: File | undefined): void => {
    if (file) {
      this.importsStore.syncCategoryMappings(file);
    } else {
      this.importsStore.clearCategorySync();
    }
  };

  protected toggleOnlyPending = (): void => this.onlyPending.update(value => !value);

  protected changeKind = (mapping: MyMoneyCategoryMappingApiModel, value: string): void => {
    const kind = +value as MyMoneyCategoryKind;
    // Lo que no aplica al nuevo tipo se limpia; la api hace lo mismo
    this.save(mapping, {
      kind,
      isEssential: kind === MyMoneyCategoryKind.Consumption && mapping.isEssential,
      isExtraordinary: kind === MyMoneyCategoryKind.Income && mapping.isExtraordinary,
      ...(kind === MyMoneyCategoryKind.Transfer ? this.pickTarget(mapping) : this.parseTarget('')),
    });
  };

  protected changeEssential = (mapping: MyMoneyCategoryMappingApiModel, checked: boolean): void =>
    this.save(mapping, { isEssential: checked });

  protected changeExtraordinary = (mapping: MyMoneyCategoryMappingApiModel, checked: boolean): void =>
    this.save(mapping, { isExtraordinary: checked });

  protected changeTarget = (mapping: MyMoneyCategoryMappingApiModel, value: string): void =>
    this.save(mapping, this.parseTarget(value));

  // Confirma la clasificación por defecto de una categoría nueva sin cambiar nada
  protected markReviewed = (mapping: MyMoneyCategoryMappingApiModel): void => this.save(mapping, {});

  // ==================== PATRONES DE DESCRIPCIÓN ====================

  protected editRule = (rule: MyMoneyDescriptionRuleApiModel): void => {
    this.editingRuleId.set(rule.id);
    this.rulePattern.set(rule.pattern);
    this.ruleTarget.set(this.targetValue(rule));
  };

  protected resetRuleForm = (): void => {
    this.editingRuleId.set(null);
    this.rulePattern.set('');
    this.ruleTarget.set('');
  };

  protected saveRule = (): void => {
    if (!this.canSaveRule()) return;
    this.importsStore.saveDescriptionRule({
      id: this.editingRuleId(),
      request: { pattern: this.rulePattern().trim(), ...this.parseTarget(this.ruleTarget()) },
      onSuccess: () => this.resetRuleForm(),
    });
  };

  protected deleteRule = (rule: MyMoneyDescriptionRuleApiModel): void => {
    this.pendingCallback = result => {
      if (!result.confirmed) return;
      if (this.editingRuleId() === rule.id) this.resetRuleForm();
      this.importsStore.deleteDescriptionRule(rule.id);
    };
    this.confirmDialog.open({
      title: this.translate.instant('myMoneyMapping.deleteRuleTitle'),
      message: this.translate.instant('myMoneyMapping.deleteRuleMessage', { pattern: rule.pattern }),
      confirmLabel: this.translate.instant('common.delete'),
      type: 'error',
    });
  };

  protected onConfirmResult(result: ConfirmDialogResult): void {
    this.pendingCallback?.(result);
    this.pendingCallback = null;
  }

  private save(mapping: MyMoneyCategoryMappingApiModel, changes: Partial<MyMoneyCategoryMappingApiModel>): void {
    const next = { ...mapping, ...changes };
    this.importsStore.updateCategoryMapping({
      id: mapping.id,
      request: {
        kind: next.kind,
        isEssential: next.isEssential,
        isExtraordinary: next.isExtraordinary,
        accountId: next.accountId,
        savingsGoalId: next.savingsGoalId,
        loanId: next.loanId,
      },
    });
  }

  private pickTarget = (target: MyMoneyLinkTargetApiModel): MyMoneyLinkTargetApiModel => ({
    accountId: target.accountId,
    savingsGoalId: target.savingsGoalId,
    loanId: target.loanId,
  });

  private parseTarget = (value: string): MyMoneyLinkTargetApiModel => {
    const [type, rawId] = value.split(':');
    const id = rawId ? +rawId : null;
    return {
      accountId: type === 'account' ? id : null,
      savingsGoalId: type === 'goal' ? id : null,
      loanId: type === 'loan' ? id : null,
    };
  };
}
