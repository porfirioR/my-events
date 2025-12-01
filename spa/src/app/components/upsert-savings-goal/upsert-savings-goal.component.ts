// src/app/components/upsert-savings-goal/upsert-savings-goal.component.ts

import { CommonModule, DatePipe } from '@angular/common';
import {
  Component,
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
import { forkJoin, startWith } from 'rxjs';
import { TextComponent } from '../inputs/text/text.component';
import { SelectInputComponent } from '../inputs/select-input/select-input.component';
import { DateInputComponent } from '../inputs/date-input/date-input.component';
import { TextAreaInputComponent } from '../inputs/text-area-input/text-area-input.component';
import {
  CreateSavingsGoalApiRequest,
  UpdateSavingsGoalApiRequest,
} from '../../models/api/savings';
import { useSavingsStore } from '../../store/savings.store';
import {
  AlertService,
  FormatterHelperService,
  ConfigurationApiService,
} from '../../services';
import { KeyValueViewModel } from '../../models/view/key-value-view-model';
import {
  Configurations,
  ProgressionType,
  ProgressionTypeDescriptions,
  ProgressionTypeLabels,
} from '../../models/enums';
import { SavingsCalculatorHelper } from '../../services/helpers/savings-calculator-helper.service';
import { SavingsGoalFormGroup } from '../../models/forms/saving-form-group';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-upsert-savings-goal',
  templateUrl: './upsert-savings-goal.component.html',
  styleUrls: ['./upsert-savings-goal.component.css'],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    TextComponent,
    SelectInputComponent,
    DateInputComponent,
    TextAreaInputComponent,
  ],
})
export class UpsertSavingsGoalComponent implements OnInit {
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private alertService = inject(AlertService);
  private configurationApiService = inject(ConfigurationApiService);
  private formatterService = inject(FormatterHelperService);
  
  private savingsStore = useSavingsStore();
  
  protected isEditMode = false;
  protected saving = false;
  public ignorePreventUnsavedChanges = false;
  
  // Enums para template
  protected ProgressionType = ProgressionType;
  protected ProgressionTypeLabels = ProgressionTypeLabels;
  
  // Lists para selects
  protected currencyList: KeyValueViewModel[] = [];
  protected progressionTypeList: KeyValueViewModel[] = [];
  
  // Form
  public formGroup: FormGroup<SavingsGoalFormGroup>;
  
  // Calculated target amount
  protected calculatedTargetAmount = signal<number | null>(null);
  
  // Calculated base amount (para mostrar en UI)
  protected calculatedBaseAmount = signal<number | null>(null);
  
  // Signals para reactividad
  protected progressionTypeIdSignal!: ReturnType<typeof toSignal<number | null>>;
  
  // Show/hide fields based on progression type
  protected showInstallmentFields!: ReturnType<typeof computed<boolean>>;
  protected showIncrementField!: ReturnType<typeof computed<boolean>>;
  protected showTargetAmountInput!: ReturnType<typeof computed<boolean>>;
  protected showBaseAmountField!: ReturnType<typeof computed<boolean>>;

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
      baseAmount: new FormControl(null), // Ahora es calculado automáticamente
      incrementAmount: new FormControl(null),
      expectedEndDate: new FormControl(null),
      statusId: new FormControl(1) // Active por defecto
    });

    // 2. SEGUNDO: Crear el signal desde el FormControl
    this.progressionTypeIdSignal = toSignal(
      this.formGroup.controls.progressionTypeId.valueChanges.pipe(
        startWith(this.formGroup.controls.progressionTypeId.value)
      ),
      { initialValue: this.formGroup.controls.progressionTypeId.value }
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

    // NUEVO: Mostrar baseAmount solo para Fixed
    this.showBaseAmountField = computed(() => {
      const typeId = this.progressionTypeIdSignal();
      return typeId === ProgressionType.Fixed;
    });

    // Effect para cargar goal si es edición
    effect(() => {
      const goal = this.savingsStore.selectedGoal();
      if (goal && this.isEditMode) {
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
          statusId: goal.statusId
        });
        this.calculateBaseAndTarget();
      }
    });

    // Calcular base amount y target amount en tiempo real
    this.formGroup.controls.progressionTypeId.valueChanges.subscribe(() => {
      this.updateFieldValidators();
      this.calculateBaseAndTarget();
    });
    
    this.formGroup.controls.numberOfInstallments.valueChanges.subscribe(() => this.calculateBaseAndTarget());
    this.formGroup.controls.baseAmount.valueChanges.subscribe(() => this.calculateBaseAndTarget());
    this.formGroup.controls.incrementAmount.valueChanges.subscribe(() => this.calculateBaseAndTarget());
  }

  ngOnInit(): void {
    const id = this.activatedRoute.snapshot.params['id'];
    if (id) {
      this.isEditMode = true;
      this.savingsStore.loadGoalById(+id);
    } else {
      this.savingsStore.clearSelectedGoal();
    }

    // Cargar catálogos
    forkJoin([
      this.configurationApiService.getCurrencies()
    ]).subscribe({
      next: ([currencies]) => {
        this.currencyList = FormatterHelperService.convertToList(currencies, Configurations.Currencies);
        this.progressionTypeList = this.getProgressionTypeList();
      },
      error: (e) => {
        this.alertService.showError('Failed to load configuration data');
        throw e;
      }
    });
  }

  private getProgressionTypeList(): KeyValueViewModel[] {
    return [
      new KeyValueViewModel(ProgressionType.Fixed, ProgressionTypeLabels[ProgressionType.Fixed], ProgressionTypeDescriptions[ProgressionType.Fixed]),
      new KeyValueViewModel(ProgressionType.Ascending, ProgressionTypeLabels[ProgressionType.Ascending], ProgressionTypeDescriptions[ProgressionType.Ascending]),
      new KeyValueViewModel(ProgressionType.Descending, ProgressionTypeLabels[ProgressionType.Descending], ProgressionTypeDescriptions[ProgressionType.Descending]),
      new KeyValueViewModel(ProgressionType.Random, ProgressionTypeLabels[ProgressionType.Random], ProgressionTypeDescriptions[ProgressionType.Random]),
      new KeyValueViewModel(ProgressionType.FreeForm, ProgressionTypeLabels[ProgressionType.FreeForm], ProgressionTypeDescriptions[ProgressionType.FreeForm])
    ];
  }

  private updateFieldValidators(): void {
    const typeId = this.formGroup.controls.progressionTypeId.value;
    
    // Reset validators
    this.formGroup.controls.targetAmount.clearValidators();
    this.formGroup.controls.numberOfInstallments.clearValidators();
    this.formGroup.controls.baseAmount.clearValidators();
    this.formGroup.controls.incrementAmount.clearValidators();

    if (typeId === ProgressionType.FreeForm) {
      // FreeForm: solo targetAmount requerido
      this.formGroup.controls.targetAmount.setValidators([Validators.required, Validators.min(1)]);
    } else if (typeId === ProgressionType.Fixed) {
      // Fixed: numberOfInstallments y baseAmount requeridos
      this.formGroup.controls.numberOfInstallments.setValidators([Validators.required, Validators.min(1)]);
      this.formGroup.controls.baseAmount.setValidators([Validators.required, Validators.min(1)]);
    } else if (typeId !== null) {
      // Ascending/Descending/Random: numberOfInstallments e incrementAmount requeridos
      this.formGroup.controls.numberOfInstallments.setValidators([Validators.required, Validators.min(1)]);
      this.formGroup.controls.incrementAmount.setValidators([Validators.required, Validators.min(1)]);
    }

    // Update validity
    this.formGroup.controls.targetAmount.updateValueAndValidity();
    this.formGroup.controls.numberOfInstallments.updateValueAndValidity();
    this.formGroup.controls.baseAmount.updateValueAndValidity();
    this.formGroup.controls.incrementAmount.updateValueAndValidity();
  }

  private calculateTargetAmount(): void {
    const typeId = this.formGroup.controls.progressionTypeId.value;
    const numberOfInstallments =
      this.formGroup.controls.numberOfInstallments.value;
    const baseAmount = this.formGroup.controls.baseAmount.value;
    const incrementAmount = this.formGroup.controls.incrementAmount.value;

    if (
      typeId === ProgressionType.FreeForm ||
      !numberOfInstallments ||
      !baseAmount
    ) {
      this.calculatedTargetAmount.set(null);
      return;
    }

    try {
      const calculated = SavingsCalculatorHelper.calculateTargetAmount(
        typeId!,
        +baseAmount,
        numberOfInstallments,
        incrementAmount || undefined
      );
      this.calculatedTargetAmount.set(calculated);
    } catch (error) {
      this.calculatedTargetAmount.set(null);
    }
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

    // Calcular baseAmount según el tipo
    if (typeId === ProgressionType.Fixed) {
      // Fixed: usa el baseAmount ingresado por el usuario
      if (!baseAmount) {
        this.calculatedBaseAmount.set(null);
        this.calculatedTargetAmount.set(null);
        return;
      }
      calculatedBase = baseAmount;
    } else if (typeId === ProgressionType.Ascending) {
      // Ascending: baseAmount = incrementAmount
      if (!incrementAmount) {
        this.calculatedBaseAmount.set(null);
        this.calculatedTargetAmount.set(null);
        return;
      }
      calculatedBase = incrementAmount;
    } else if (typeId === ProgressionType.Descending) {
      // Descending: baseAmount = incrementAmount × numberOfInstallments
      if (!incrementAmount) {
        this.calculatedBaseAmount.set(null);
        this.calculatedTargetAmount.set(null);
        return;
      }
      calculatedBase = incrementAmount * numberOfInstallments;
    } else if (typeId === ProgressionType.Random) {
      // Random: baseAmount = incrementAmount (similar a Ascending)
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

    // Actualizar el calculatedBaseAmount para mostrar en UI
    this.calculatedBaseAmount.set(calculatedBase);

    // Calcular targetAmount usando el helper
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
    
    // Determinar el baseAmount final a enviar
    let finalBaseAmount: number | undefined;
    let finalTargetAmount: number;

    if (typeId === ProgressionType.FreeForm) {
      finalTargetAmount = values.targetAmount!;
      finalBaseAmount = undefined;
    } else if (typeId === ProgressionType.Fixed) {
      // Fixed: usa el baseAmount del form
      finalBaseAmount = values.baseAmount!;
      finalTargetAmount = this.calculatedTargetAmount() || 0;
    } else {
      // Ascending/Descending/Random: usa el baseAmount calculado
      finalBaseAmount = this.calculatedBaseAmount() || undefined;
      finalTargetAmount = this.calculatedTargetAmount() || 0;
    }
    const numberOfInstallments = values.numberOfInstallments || undefined
    const incrementAmount = values.incrementAmount || undefined
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
        values.expectedEndDate?.toString() || undefined
      );

      this.savingsStore.updateGoal(values.id!, request).subscribe({
        next: () => {
          this.ignorePreventUnsavedChanges = true;
          this.alertService.showSuccess('Savings goal updated successfully');
          this.exit();
        },
        error: (e) => {
          this.formGroup.enable();
          this.saving = false;
          this.alertService.showError('Failed to update savings goal');
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
        values.expectedEndDate?.toString() || undefined
      );

      this.savingsStore.createGoal(request).subscribe({
        next: () => {
          this.ignorePreventUnsavedChanges = true;
          this.alertService.showSuccess('Savings goal created successfully');
          this.exit();
        },
        error: (e) => {
          this.formGroup.enable();
          this.saving = false;
          this.alertService.showError('Failed to create savings goal');
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
        return 'Each installment increases by this amount (Week 1: ₲1,000, Week 2: ₲2,000...)';
      case ProgressionType.Descending:
        return 'Each installment decreases by this amount (starts high, ends low)';
      case ProgressionType.Random:
        return 'Amounts are shuffled randomly based on this increment';
      default:
        return 'Amount to increase/decrease per installment';
    }
  }

  protected getProgressionDescription(): string {
    const typeId = this.formGroup.controls.progressionTypeId.value;
    
    switch(typeId) {
      case ProgressionType.Ascending:
        return 'increasing';
      case ProgressionType.Descending:
        return 'decreasing';
      case ProgressionType.Random:
        return 'random order';
      default:
        return '';
    }
  }
}
