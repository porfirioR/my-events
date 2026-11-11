import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { map, startWith } from 'rxjs';
import { FileUploadComponent } from '../file-upload/file-upload.component';
import { ConfirmDialogComponent, ConfirmDialogResult } from '../confirm-dialog/confirm-dialog.component';
import { SelectInputComponent } from '../inputs/select-input/select-input.component';
import { CheckBoxInputComponent } from '../inputs/check-box-input/check-box-input.component';
import { TextComponent } from '../inputs/text/text.component';
import { KeyValueViewModel } from '../../models/view/key-value-view-model';
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
// Valor del select de destino cuando no hay cuenta, ahorro ni préstamo
const NO_TARGET = '';

interface MappingFormGroup {
  kind: FormControl<MyMoneyCategoryKind>;
  isEssential: FormControl<boolean>;
  isExtraordinary: FormControl<boolean>;
  target: FormControl<string>;
}

interface RuleFormGroup {
  pattern: FormControl<string>;
  target: FormControl<string | null>;
}

interface MappingRow {
  mapping: MyMoneyCategoryMappingApiModel;
  form: FormGroup<MappingFormGroup>;
}

interface MappingGroup {
  title: string;
  hint: string;
  rows: MappingRow[];
}

// Clasificación de las categorías de MyMoney y patrones de descripción (#231).
// Las categorías se cargan desde un export; cada fila tiene su formulario y se guarda al cambiar.
@Component({
  selector: 'app-mymoney-category-mapping',
  templateUrl: './mymoney-category-mapping.component.html',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    FileUploadComponent,
    ConfirmDialogComponent,
    SelectInputComponent,
    CheckBoxInputComponent,
    TextComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyMoneyCategoryMappingComponent {
  @ViewChild(ConfirmDialogComponent) confirmDialog!: ConfirmDialogComponent;

  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);
  private importsStore = useImportsStore();
  private accountsStore = useAccountsStore();
  private savingsStore = useSavingsStore();
  private loansStore = useLoansStore();
  private pendingCallback: ((result: ConfirmDialogResult) => void) | null = null;
  // Un formulario por categoría; se conserva entre recargas para no perder la suscripción
  private forms = new Map<number, MappingRow>();

  protected readonly maxSize = MAX_EXPORT_SIZE;
  protected readonly Kind = MyMoneyCategoryKind;

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
  protected ruleForm = new FormGroup<RuleFormGroup>({
    pattern: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    target: new FormControl<string | null>(null, Validators.required),
  });

  private language = toSignal(
    this.translate.onLangChange.pipe(map(event => event.lang), startWith(this.translate.getCurrentLang())),
    { initialValue: this.translate.getCurrentLang() },
  );

  private categoryNames = computed<Record<string, string>>(() => {
    this.language();
    const names = this.translate.instant('myMoneyImport.categoryNames');
    return typeof names === 'object' && names ? names : {};
  });

  protected kindOptions = computed<Record<MyMoneyMappingMovementType, KeyValueViewModel[]>>(() => {
    this.language();
    const options = (movementType: MyMoneyMappingMovementType) => MyMoneyKindsByMovementType[movementType]
      .map(kind => new KeyValueViewModel(kind, this.translate.instant(MyMoneyCategoryKindLabels[kind]), ''));
    return {
      [MyMoneyMappingMovementType.Expense]: options(MyMoneyMappingMovementType.Expense),
      [MyMoneyMappingMovementType.Income]: options(MyMoneyMappingMovementType.Income),
    };
  });

  // Cuentas, ahorros y préstamos en una sola lista; el tipo va en el texto de cada opción
  protected targetOptions = computed<KeyValueViewModel[]>(() => {
    this.language();
    const group = (key: string) => this.translate.instant(`myMoneyMapping.targets.${key}`);
    return [
      ...this.accountsStore.accounts().map(account => new KeyValueViewModel(`account:${account.id}`, `${account.name} · ${group('accounts')}`, '')),
      ...this.savingsStore.goals().map(goal => new KeyValueViewModel(`goal:${goal.id}`, `${goal.name} · ${group('savingsGoals')}`, '')),
      ...this.loansStore.loans().map(loan => new KeyValueViewModel(`loan:${loan.id}`, `${loan.name} · ${group('loans')}`, '')),
    ];
  });

  protected mappingTargetOptions = computed<KeyValueViewModel[]>(() => [
    new KeyValueViewModel(NO_TARGET, this.translate.instant('myMoneyMapping.noTarget'), ''),
    ...this.targetOptions(),
  ]);

  protected groups = computed<MappingGroup[]>(() => {
    const visible = this.mappings()
      .filter(mapping => !this.onlyPending() || mapping.needsReview)
      .map(mapping => this.rowFor(mapping));
    return [
      {
        title: 'myMoneyMapping.expenseCategories',
        hint: 'myMoneyMapping.expenseHint',
        rows: visible.filter(row => row.mapping.movementType === MyMoneyMappingMovementType.Expense),
      },
      {
        title: 'myMoneyMapping.incomeCategories',
        hint: 'myMoneyMapping.incomeHint',
        rows: visible.filter(row => row.mapping.movementType === MyMoneyMappingMovementType.Income),
      },
    ];
  });

  constructor() {
    this.importsStore.loadMappings();
    this.accountsStore.loadAccounts();
    this.savingsStore.loadGoals();
    this.loansStore.reloadLoans();
    this.destroyRef.onDestroy(() => this.importsStore.clearCategorySync());

    // La fila que se está guardando queda deshabilitada hasta que responde la api
    effect(() => {
      const saving = this.importsStore.savingMappingIds();
      this.forms.forEach(({ form }, id) => {
        if (saving.includes(id)) {
          form.disable({ emitEvent: false });
        } else {
          form.enable({ emitEvent: false });
        }
      });
    });
  }

  protected categoryName = (name: string): string => this.categoryNames()[name] ?? name;

  protected isSaving = (id: number): boolean => this.importsStore.savingMappingIds().includes(id);

  protected targetLabel = (target: MyMoneyLinkTargetApiModel): string => {
    const value = this.targetValue(target);
    return this.targetOptions().find(option => option.key === value)?.value ?? '—';
  };

  protected onFileSelected = (file: File | undefined): void => {
    if (file) {
      this.importsStore.syncCategoryMappings(file);
    } else {
      this.importsStore.clearCategorySync();
    }
  };

  protected toggleOnlyPending = (): void => this.onlyPending.update(value => !value);

  // Confirma la clasificación por defecto de una categoría nueva sin cambiar nada
  protected markReviewed = (row: MappingRow): void => this.save(row.mapping.id, row.form);

  // ==================== PATRONES DE DESCRIPCIÓN ====================

  protected editRule = (rule: MyMoneyDescriptionRuleApiModel): void => {
    this.editingRuleId.set(rule.id);
    this.ruleForm.reset({ pattern: rule.pattern, target: this.targetValue(rule) });
  };

  protected resetRuleForm = (): void => {
    this.editingRuleId.set(null);
    this.ruleForm.reset({ pattern: '', target: null });
  };

  protected saveRule = (): void => {
    if (this.ruleForm.invalid || this.isRuleSaving()) {
      this.ruleForm.markAllAsTouched();
      return;
    }
    const { pattern, target } = this.ruleForm.getRawValue();
    this.importsStore.saveDescriptionRule({
      id: this.editingRuleId(),
      request: { pattern: pattern.trim(), ...this.parseTarget(target ?? NO_TARGET) },
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

  // Crea el formulario de la categoría la primera vez; si la api devolvió una versión nueva,
  // la copia al formulario sin disparar otro guardado
  private rowFor(mapping: MyMoneyCategoryMappingApiModel): MappingRow {
    const existing = this.forms.get(mapping.id);
    if (existing) {
      if (existing.mapping !== mapping) {
        existing.form.setValue(this.formValue(mapping), { emitEvent: false });
        existing.mapping = mapping;
      }
      return existing;
    }
    const form = new FormGroup<MappingFormGroup>({
      kind: new FormControl(mapping.kind, { nonNullable: true }),
      isEssential: new FormControl(mapping.isEssential, { nonNullable: true }),
      isExtraordinary: new FormControl(mapping.isExtraordinary, { nonNullable: true }),
      target: new FormControl(this.targetValue(mapping), { nonNullable: true }),
    });
    form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.save(mapping.id, form));
    const row = { mapping, form };
    this.forms.set(mapping.id, row);
    return row;
  }

  private formValue = (mapping: MyMoneyCategoryMappingApiModel) => ({
    kind: mapping.kind,
    isEssential: mapping.isEssential,
    isExtraordinary: mapping.isExtraordinary,
    target: this.targetValue(mapping),
  });

  // Lo que no aplica a la clasificación elegida se manda limpio; la api hace lo mismo
  private save(id: number, form: FormGroup<MappingFormGroup>): void {
    const { kind, isEssential, isExtraordinary, target } = form.getRawValue();
    this.importsStore.updateCategoryMapping({
      id,
      request: {
        kind: +kind as MyMoneyCategoryKind,
        isEssential: +kind === MyMoneyCategoryKind.Consumption && isEssential,
        isExtraordinary: +kind === MyMoneyCategoryKind.Income && isExtraordinary,
        ...this.parseTarget(+kind === MyMoneyCategoryKind.Transfer ? target : NO_TARGET),
      },
    });
  }

  private targetValue = (target: MyMoneyLinkTargetApiModel): string => {
    if (target.accountId) return `account:${target.accountId}`;
    if (target.savingsGoalId) return `goal:${target.savingsGoalId}`;
    if (target.loanId) return `loan:${target.loanId}`;
    return NO_TARGET;
  };

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
