import { CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  effect,
  computed,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { startWith } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TextComponent } from '../inputs/text/text.component';
import { SelectInputComponent } from '../inputs/select-input/select-input.component';
import { DateInputComponent } from '../inputs/date-input/date-input.component';
import { TextAreaInputComponent } from '../inputs/text-area-input/text-area-input.component';
import {
  CreateSavingsGoalApiRequest,
  UpdateSavingsGoalApiRequest,
} from '../../models/api/savings';
import { SavingsGoalApiService } from '../../services/api/saving-api.service';
import { useSavingsStore } from '../../store/savings.store';
import { useCurrencyStore } from '../../store/currency.store';
import {
  AlertService,
  FormatterHelperService,
} from '../../services';
import { KeyValueViewModel } from '../../models/view/key-value-view-model';
import {
  Configurations,
  ProgressionType,
  ProgressionTypeDescriptions,
  ProgressionTypeLabels,
  SavingsFrequency,
  SavingsFrequencyLabels,
} from '../../models/enums';
import { SavingsCalculatorHelper } from '../../services/helpers/savings-calculator-helper.service';
import { SavingsGoalFormGroup } from '../../models/forms/saving-form-group';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-upsert-savings-goal',
  templateUrl: './upsert-savings-goal.component.html',
  styleUrls: ['./upsert-savings-goal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    TranslateModule,
    TextComponent,
    SelectInputComponent,
    DateInputComponent,
    TextAreaInputComponent,
  ],
})
export class UpsertSavingsGoalComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private alertService = inject(AlertService);
  private formatterService = inject(FormatterHelperService);
  private translate = inject(TranslateService);

  private savingsStore = useSavingsStore();
  private currencyStore = useCurrencyStore();
  private savingsGoalApiService = inject(SavingsGoalApiService);

  protected isEditMode = false;
  protected saving = false;
  public ignorePreventUnsavedChanges = false;

  // Enums para template
  protected ProgressionType = ProgressionType;
  protected ProgressionTypeLabels = ProgressionTypeLabels;
  protected SavingsFrequency = SavingsFrequency;

  // Lists para selects
  protected currencyList: KeyValueViewModel[] = [];
  protected progressionTypeList: KeyValueViewModel[] = [];
  protected frequencyList: KeyValueViewModel[] = [];

  // Programmed terms desde el store
  protected termSelectList = computed(() =>
    this.savingsStore.programmedTerms().map(t =>
      new KeyValueViewModel(
        t.termMonths,
        `${t.termMonths} ${this.translate.instant('upsertSavingsGoal.months')}`,
        `${this.translate.instant('upsertSavingsGoal.suggestedRate')}: ${t.annualRatePercentage}%`
      )
    )
  );

  // Yield info for programmed savings
  protected yieldInfo = signal<{ yieldAmount: number; totalDeposited: number; totalAmount: number } | null>(null);

  // Form
  public formGroup: FormGroup<SavingsGoalFormGroup>;

  // Calculated target amount
  protected calculatedTargetAmount = signal<number | null>(null);

  // Calculated base amount (para mostrar en UI)
  protected calculatedBaseAmount = signal<number | null>(null);

  // Signals para reactividad
  protected progressionTypeIdSignal!: ReturnType<typeof toSignal<number | null>>;
  protected frequencyIdSignal!: ReturnType<typeof toSignal<number | null>>;

  // Show/hide fields based on progression type
  protected showInstallmentFields!: ReturnType<typeof computed<boolean>>;
  protected showIncrementField!: ReturnType<typeof computed<boolean>>;
  protected showTargetAmountInput!: ReturnType<typeof computed<boolean>>;
  protected showBaseAmountField!: ReturnType<typeof computed<boolean>>;
  protected showFrequencyField!: ReturnType<typeof computed<boolean>>;
  protected isProgrammedSavings!: ReturnType<typeof computed<boolean>>;

  constructor() {
    const today = new DatePipe('en-US').transform(new Date(), 'yyyy-MM-dd', 'UTC') as string;

    // 1. PRIMERO: Crear el FormGroup
    this.formGroup = new FormGroup<SavingsGoalFormGroup>({
      id: new FormControl(null),
      name: new FormControl('', [Validators.required, Validators.maxLength(200)]),
      description: new FormControl('', [Validators.maxLength(500)]),
      startDate: new FormControl(today, [Validators.required]),
      currencyId: new FormControl(null, [Validators.required]),
      progressionTypeId: new FormControl(null, [Validators.required]),
      targetAmount: new FormControl(null),
      numberOfInstallments: new FormControl(null),
      baseAmount: new FormControl(null),
      incrementAmount: new FormControl(null),
      expectedEndDate: new FormControl(null),
      statusId: new FormControl(1),
      frequencyId: new FormControl<number | null>(null),
      annualRatePercentage: new FormControl<number | null>(null),
    });

    // 2. SEGUNDO: Crear los signals desde los FormControls
    this.progressionTypeIdSignal = toSignal(
      this.formGroup.controls.progressionTypeId.valueChanges.pipe(
        startWith(this.formGroup.controls.progressionTypeId.value)
      ),
      { initialValue: this.formGroup.controls.progressionTypeId.value }
    );

    this.frequencyIdSignal = toSignal(
      this.formGroup.controls.frequencyId.valueChanges.pipe(
        startWith(this.formGroup.controls.frequencyId.value)
      ),
      { initialValue: this.formGroup.controls.frequencyId.value }
    );

    // 3. TERCERO: Crear los computed signals
    this.showInstallmentFields = computed(() => {
      const typeId = this.progressionTypeIdSignal();
      return typeId !== null && typeId !== ProgressionType.FreeForm;
    });

    this.showIncrementField = computed(() => {
      const typeId = this.progressionTypeIdSignal();
      return typeId === ProgressionType.Ascending || 
             typeId === ProgressionType.Descending || 
             typeId === ProgressionType.Random;
    });
    
    this.showTargetAmountInput = computed(() => {
      const typeId = this.progressionTypeIdSignal();
      return typeId === ProgressionType.FreeForm;
    });

    this.showBaseAmountField = computed(() => {
      const typeId = this.progressionTypeIdSignal();
      return typeId === ProgressionType.Fixed || typeId === ProgressionType.Scheduled;
    });

    this.showFrequencyField = computed(() => {
      const typeId = this.progressionTypeIdSignal();
      return typeId === ProgressionType.Scheduled;
    });

    this.isProgrammedSavings = computed(() => this.progressionTypeIdSignal() === ProgressionType.Scheduled);

    // Effect para cargar currencies cuando estén listas
    effect(() => {
      const currencies = this.currencyStore.getAllCurrencies();
      if (currencies.length > 0) {
        this.currencyList = this.formatterService.convertToList(currencies, Configurations.Currencies);
        this.progressionTypeList = this.getProgressionTypeList();
        this.frequencyList = this.getFrequencyList();
      }
    });

    // Effect para cargar goal cuando todo esté listo
    effect(() => {
      const goal = this.savingsStore.selectedGoal();
      const hasCurrencies = this.currencyStore.isLoaded();

      if (goal && this.isEditMode && hasCurrencies) {
        this.loadGoalIntoForm(goal);
      }
    });

    // Calcular base amount y target amount en tiempo real
    this.formGroup.controls.progressionTypeId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.updateFieldValidators();
      this.calculateBaseAndTarget();
    });

    this.formGroup.controls.numberOfInstallments.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.calculateBaseAndTarget());
    this.formGroup.controls.baseAmount.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.calculateBaseAndTarget());
    this.formGroup.controls.incrementAmount.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.calculateBaseAndTarget());
    this.formGroup.controls.frequencyId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.calculateBaseAndTarget());
    this.formGroup.controls.annualRatePercentage.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.calculateBaseAndTarget());
  }

  ngOnInit(): void {
    const id = this.activatedRoute.snapshot.params['id'];
    if (id) {
      this.isEditMode = true;
      this.savingsStore.loadGoalById(+id);
    } else {
      this.savingsStore.clearSelectedGoal();
    }

    this.currencyStore.loadCurrencies();
    this.savingsStore.loadProgrammedTerms();
  }

  private loadGoalIntoForm(goal: any): void {
    const startDate = new DatePipe('en-US').transform(new Date(goal.startDate), 'yyyy-MM-dd', 'UTC') as string;
    const expectedEndDate = goal.expectedEndDate 
      ? new DatePipe('en-US').transform(new Date(goal.expectedEndDate), 'yyyy-MM-dd', 'UTC') as string
      : null;

    this.formGroup.patchValue({
      id: goal.id,
      name: goal.name,
      description: goal.description,
      startDate: startDate,
      currencyId: goal.currencyId,
      progressionTypeId: goal.progressionTypeId,
      targetAmount: goal.targetAmount,
      numberOfInstallments: goal.numberOfInstallments,
      baseAmount: goal.baseAmount,
      incrementAmount: goal.incrementAmount,
      expectedEndDate: expectedEndDate,
      statusId: goal.statusId,
      frequencyId: goal.frequencyId ?? null,
      annualRatePercentage: goal.annualRatePercentage ?? null,
    });

    this.formGroup.controls.numberOfInstallments.disable()
    this.formGroup.controls.incrementAmount.disable()
    this.formGroup.controls.progressionTypeId.disable()

    this.updateFieldValidators();
    this.calculateBaseAndTarget();

    // Restore the stored targetAmount after recalculation so the user's
    // saved value (possibly adjusted to match their bank) is preserved on load.
    if (goal.progressionTypeId === ProgressionType.Scheduled && goal.targetAmount) {
      this.formGroup.controls.targetAmount.setValue(goal.targetAmount, { emitEvent: false });
    }
  }

  private getProgressionTypeList(): KeyValueViewModel[] {
    return [
      new KeyValueViewModel(
        ProgressionType.Fixed,
        this.translate.instant(ProgressionTypeLabels[ProgressionType.Fixed]),
        this.translate.instant(ProgressionTypeDescriptions[ProgressionType.Fixed])
      ),
      new KeyValueViewModel(
        ProgressionType.Ascending,
        this.translate.instant(ProgressionTypeLabels[ProgressionType.Ascending]),
        this.translate.instant(ProgressionTypeDescriptions[ProgressionType.Ascending])
      ),
      new KeyValueViewModel(
        ProgressionType.Descending,
        this.translate.instant(ProgressionTypeLabels[ProgressionType.Descending]),
        this.translate.instant(ProgressionTypeDescriptions[ProgressionType.Descending])
      ),
      new KeyValueViewModel(
        ProgressionType.Random,
        this.translate.instant(ProgressionTypeLabels[ProgressionType.Random]),
        this.translate.instant(ProgressionTypeDescriptions[ProgressionType.Random])
      ),
      new KeyValueViewModel(
        ProgressionType.FreeForm,
        this.translate.instant(ProgressionTypeLabels[ProgressionType.FreeForm]),
        this.translate.instant(ProgressionTypeDescriptions[ProgressionType.FreeForm])
      ),
      new KeyValueViewModel(
        ProgressionType.Scheduled,
        this.translate.instant(ProgressionTypeLabels[ProgressionType.Scheduled]),
        this.translate.instant(ProgressionTypeDescriptions[ProgressionType.Scheduled])
      ),
    ];
  }

  private getFrequencyList(): KeyValueViewModel[] {
    return [
      new KeyValueViewModel(
        SavingsFrequency.Monthly,
        this.translate.instant(SavingsFrequencyLabels[SavingsFrequency.Monthly]),
        ''
      ),
    ];
  }

  private updateFieldValidators(): void {
    const typeId = this.formGroup.controls.progressionTypeId.value;

    // Reset validators
    this.formGroup.controls.targetAmount.clearValidators();
    this.formGroup.controls.numberOfInstallments.clearValidators();
    this.formGroup.controls.baseAmount.clearValidators();
    this.formGroup.controls.incrementAmount.clearValidators();
    this.formGroup.controls.frequencyId.clearValidators();
    this.formGroup.controls.annualRatePercentage.clearValidators();

    if (typeId === ProgressionType.FreeForm) {
      this.formGroup.controls.targetAmount.setValidators([Validators.required, Validators.min(1)]);
    } else if (typeId === ProgressionType.Fixed || typeId === ProgressionType.Scheduled) {
      this.formGroup.controls.numberOfInstallments.setValidators([Validators.required, Validators.min(1)]);
      this.formGroup.controls.baseAmount.setValidators([Validators.required, Validators.min(1)]);
      if (typeId === ProgressionType.Scheduled) {
        this.formGroup.controls.frequencyId.setValidators([Validators.required]);
        this.formGroup.controls.annualRatePercentage.setValidators([Validators.required, Validators.min(0.01), Validators.max(100)]);
        this.formGroup.controls.targetAmount.setValidators([Validators.required, Validators.min(1)]);
      }
    } else if (typeId !== null) {
      this.formGroup.controls.numberOfInstallments.setValidators([Validators.required, Validators.min(1)]);
      this.formGroup.controls.incrementAmount.setValidators([Validators.required, Validators.min(1)]);
    }

    this.formGroup.controls.targetAmount.updateValueAndValidity();
    this.formGroup.controls.numberOfInstallments.updateValueAndValidity();
    this.formGroup.controls.baseAmount.updateValueAndValidity();
    this.formGroup.controls.incrementAmount.updateValueAndValidity();
    this.formGroup.controls.frequencyId.updateValueAndValidity();
    this.formGroup.controls.annualRatePercentage.updateValueAndValidity();
  }

  private calculateBaseAndTarget(): void {
    const typeId = this.formGroup.controls.progressionTypeId.value;
    const numberOfInstallments = this.formGroup.controls.numberOfInstallments.value;
    const incrementAmount = this.formGroup.controls.incrementAmount.value;
    const baseAmount = this.formGroup.controls.baseAmount.value;

    if (typeId === ProgressionType.FreeForm) {
      this.calculatedBaseAmount.set(null);
      this.calculatedTargetAmount.set(null);
      return;
    }

    if (!numberOfInstallments) {
      this.calculatedBaseAmount.set(null);
      this.calculatedTargetAmount.set(null);
      return;
    }

    let calculatedBase: number;

    if (typeId === ProgressionType.Fixed || typeId === ProgressionType.Scheduled) {
      if (!baseAmount) {
        this.calculatedBaseAmount.set(null);
        this.calculatedTargetAmount.set(null);
        this.yieldInfo.set(null);
        return;
      }
      // Auto-fill suggested rate when term changes (only if rate is empty)
      if (typeId === ProgressionType.Scheduled && numberOfInstallments) {
        const currentRate = this.formGroup.controls.annualRatePercentage.value;
        if (!currentRate) {
          const term = this.savingsStore.programmedTerms().find(t => t.termMonths === +numberOfInstallments);
          if (term) {
            this.formGroup.controls.annualRatePercentage.setValue(term.annualRatePercentage, { emitEvent: false });
          }
        }
      }
      calculatedBase = baseAmount;
    } else if (typeId === ProgressionType.Ascending) {
      if (!incrementAmount) {
        this.calculatedBaseAmount.set(null);
        this.calculatedTargetAmount.set(null);
        return;
      }
      calculatedBase = incrementAmount;
    } else if (typeId === ProgressionType.Descending) {
      if (!incrementAmount) {
        this.calculatedBaseAmount.set(null);
        this.calculatedTargetAmount.set(null);
        return;
      }
      calculatedBase = incrementAmount * numberOfInstallments;
    } else if (typeId === ProgressionType.Random) {
      if (!incrementAmount) {
        this.calculatedBaseAmount.set(null);
        this.calculatedTargetAmount.set(null);
        return;
      }
      calculatedBase = incrementAmount;
    } else {
      this.calculatedBaseAmount.set(null);
      this.calculatedTargetAmount.set(null);
      return;
    }

    this.calculatedBaseAmount.set(calculatedBase);

    try {
      const calculated = SavingsCalculatorHelper.calculateTargetAmount(
        typeId!,
        +calculatedBase,
        +numberOfInstallments,
        incrementAmount || undefined
      );
      this.calculatedTargetAmount.set(calculated);
    } catch (error) {
      this.calculatedTargetAmount.set(null);
    }

    if (typeId === ProgressionType.Scheduled && baseAmount && numberOfInstallments) {
      const annualRate = this.formGroup.controls.annualRatePercentage.value;
      if (annualRate && annualRate > 0) {
        const yi = this.calculateProgrammedYield(+baseAmount, +numberOfInstallments, annualRate);
        this.yieldInfo.set(yi);
        this.calculatedTargetAmount.set(yi.totalAmount);
        // Pre-fill targetAmount with calculated value (user can override)
        this.formGroup.controls.targetAmount.setValue(yi.totalAmount, { emitEvent: false });
      } else {
        this.yieldInfo.set(null);
      }
    } else {
      this.yieldInfo.set(null);
    }
  }

  private calculateProgrammedYield(
    monthlyAmount: number,
    termMonths: number,
    annualRatePercentage: number,
  ): { yieldAmount: number; totalDeposited: number; totalAmount: number } {
    const i = annualRatePercentage / 100 / 12;
    // Annuity due: each deposit earns interest from the moment it's made
    const fv = monthlyAmount * ((Math.pow(1 + i, termMonths) - 1) / i) * (1 + i);
    const totalDeposited = monthlyAmount * termMonths;
    return {
      yieldAmount: Math.round(fv - totalDeposited),
      totalDeposited,
      totalAmount: Math.round(fv),
    };
  }

  protected save = (event?: Event): void => {
    event?.preventDefault();

    if (this.formGroup.invalid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.formGroup.disable();

    const values = this.formGroup.getRawValue();
    const typeId = values.progressionTypeId!;
    
    let finalBaseAmount: number | undefined;
    let finalTargetAmount: number;

    if (typeId === ProgressionType.FreeForm) {
      finalTargetAmount = values.targetAmount!;
      finalBaseAmount = undefined;
    } else if (typeId === ProgressionType.Scheduled) {
      finalBaseAmount = values.baseAmount!;
      // Use user-edited targetAmount (pre-filled with calculated value)
      finalTargetAmount = values.targetAmount || this.calculatedTargetAmount() || 0;
    } else if (typeId === ProgressionType.Fixed) {
      finalBaseAmount = values.baseAmount!;
      finalTargetAmount = this.calculatedTargetAmount() || 0;
    } else {
      finalBaseAmount = this.calculatedBaseAmount() || undefined;
      finalTargetAmount = this.calculatedTargetAmount() || 0;
    }

    const numberOfInstallments = values.numberOfInstallments || undefined;
    const incrementAmount = values.incrementAmount || undefined;

    if (this.isEditMode) {
      const request = new UpdateSavingsGoalApiRequest(
        values.id!,
        values.currencyId!,
        values.name!,
        +finalTargetAmount,
        values.progressionTypeId!,
        values.statusId || 1,
        values.startDate!.toString(),
        values.description || undefined,
        numberOfInstallments ? +numberOfInstallments : undefined,
        finalBaseAmount ? +finalBaseAmount : undefined,
        incrementAmount ? +incrementAmount : undefined,
        values.expectedEndDate?.toString() || undefined,
        values.frequencyId ?? undefined,
        values.annualRatePercentage ?? undefined,
      );

      this.savingsStore.updateGoal(values.id!, request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.ignorePreventUnsavedChanges = true;
          this.alertService.showSuccess(
            this.translate.instant('upsertSavingsGoal.goalUpdatedSuccess')
          );
          this.exit();
        },
        error: (e) => {
          this.formGroup.enable();
          this.saving = false;
          throw e;
        }
      });
    } else {
      const request = new CreateSavingsGoalApiRequest(
        values.currencyId!,
        values.name!,
        values.progressionTypeId!,
        values.startDate!.toString(),
        values.description || undefined,
        +finalTargetAmount,
        numberOfInstallments ? +numberOfInstallments : undefined,
        finalBaseAmount ? +finalBaseAmount : undefined,
        incrementAmount ? +incrementAmount : undefined,
        values.expectedEndDate?.toString() || undefined,
        values.frequencyId ?? undefined,
        values.annualRatePercentage ?? undefined,
      );

      this.savingsStore.createGoal(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.ignorePreventUnsavedChanges = true;
          this.alertService.showSuccess(
            this.translate.instant('upsertSavingsGoal.goalCreatedSuccess')
          );
          this.exit();
        },
        error: (e) => {
          this.formGroup.enable();
          this.saving = false;
          this.alertService.showError(
            this.translate.instant('upsertSavingsGoal.goalCreatedError')
          );
          throw e;
        }
      });
    }
  };

  protected cancel = (): void => {
    this.exit();
  };

  protected exit = (): void => {
    this.router.navigate(['/savings']);
  };

  protected formatCurrency = this.formatterService.formatCurrency;

  protected getIncrementDescription(): string {
    const typeId = this.formGroup.controls.progressionTypeId.value;

    switch(typeId) {
      case ProgressionType.Ascending:
        return this.translate.instant('upsertSavingsGoal.incrementDescAscending');
      case ProgressionType.Descending:
        return this.translate.instant('upsertSavingsGoal.incrementDescDescending');
      case ProgressionType.Random:
        return this.translate.instant('upsertSavingsGoal.incrementDescRandom');
      default:
        return this.translate.instant('upsertSavingsGoal.incrementDescDefault');
    }
  }

  protected getProgressionDescription(): string {
    const typeId = this.formGroup.controls.progressionTypeId.value;

    switch(typeId) {
      case ProgressionType.Ascending:
        return this.translate.instant('upsertSavingsGoal.increasing');
      case ProgressionType.Descending:
        return this.translate.instant('upsertSavingsGoal.decreasing');
      case ProgressionType.Random:
        return this.translate.instant('upsertSavingsGoal.randomOrder');
      default:
        return '';
    }
  }
}