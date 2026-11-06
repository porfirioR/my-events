import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, EventEmitter, Output, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { useAccountsStore, useSavingsStore } from '../../store';
import { NO_ACCOUNT } from '../../services/helpers/formatter-helper.service';
import { SelectInputComponent } from '../inputs/select-input/select-input.component';
import { AlertService, FormatterHelperService } from '../../services';
import { MovementType, ProgressionType } from '../../models/enums';
import { CreateSavingsMovementApiRequest } from '../../models/api/savings';
import { TextComponent } from '../inputs/text/text.component';
import { TextAreaInputComponent } from '../inputs/text-area-input/text-area-input.component';
import { DateInputComponent } from '../inputs/date-input/date-input.component';
import { SavingsCalculatorHelper } from '../../services/helpers/savings-calculator-helper.service';

export interface SavingsMovementModalData {
  goalId: number;
  currencyId: number;
  currentAmount: number;
  annualRatePercentage: number | null;
  startDate: Date | string;
  movementType: number;
  progressionTypeId: number;
  targetAmount: number;
}

interface SavingsMovementFormGroup {
  amount: FormControl<number | null>;
  description: FormControl<string | null>;
  date: FormControl<string | null>;
  accountId: FormControl<number>;
}

@Component({
  selector: 'app-savings-movement-modal',
  templateUrl: './savings-movement-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    TextComponent,
    TextAreaInputComponent,
    DateInputComponent,
    SelectInputComponent,
  ],
})
export class SavingsMovementModalComponent {
  private destroyRef = inject(DestroyRef);
  private alertService = inject(AlertService);
  private translate = inject(TranslateService);
  private formatterService = inject(FormatterHelperService);
  private savingsStore = useSavingsStore();
  private accountsStore = useAccountsStore();

  private goalId: number | null = null;

  @Output() completed = new EventEmitter<void>();

  protected visible = signal(false);
  protected isSubmitting = signal(false);
  protected movementType = signal<number>(MovementType.Deposit);
  protected currencyId = signal<number>(1);
  protected maxAmount = signal<number | null>(null);
  protected maxAmountHint = signal('');
  protected form: FormGroup<SavingsMovementFormGroup>;
  // Un depósito sale de la cuenta elegida y un retiro entra a ella
  protected accountList = computed(() =>
    this.formatterService.accountOptions(this.accountsStore.accounts(), this.currencyId()));

  protected MovementType = MovementType;
  protected formatCurrency = this.formatterService.formatCurrency.bind(this.formatterService);

  constructor() {
    this.form = new FormGroup<SavingsMovementFormGroup>({
      amount: new FormControl(null, [Validators.required, Validators.min(1)]),
      description: new FormControl(''),
      date: new FormControl(this.todayAsString(), [Validators.required]),
      accountId: new FormControl<number>(NO_ACCOUNT, { nonNullable: true }),
    });
    this.accountsStore.loadAccounts();
  }

  public open(data: SavingsMovementModalData): void {
    this.goalId = data.goalId;
    this.currencyId.set(data.currencyId);
    this.movementType.set(data.movementType);

    this.form.reset();
    this.form.patchValue({ amount: null, description: '', date: this.todayAsString(), accountId: NO_ACCOUNT });

    this.form.controls.amount.clearValidators();
    this.form.controls.amount.addValidators([Validators.required, Validators.min(1)]);

    const maxAmount = this.getMaxAmount(data);
    this.maxAmount.set(maxAmount);
    this.maxAmountHint.set(maxAmount === null ? '' : this.getMaxAmountHint(data));
    if (maxAmount !== null) {
      this.form.controls.amount.addValidators(Validators.max(maxAmount));
    }
    this.form.controls.amount.updateValueAndValidity();

    this.visible.set(true);
  }

  // Tope del monto: forma libre retira hasta el saldo y deposita hasta la meta;
  // fondo mutuo retira hasta el saldo + interés devengado y deposita sin tope
  private getMaxAmount(data: SavingsMovementModalData): number | null {
    const isFreeForm = data.progressionTypeId === ProgressionType.FreeForm;
    if (data.movementType === MovementType.Withdrawal) {
      return isFreeForm
        ? data.currentAmount
        : SavingsCalculatorHelper.calculateMutualFundMaxWithdrawal(data.currentAmount, data.annualRatePercentage, data.startDate);
    }
    return isFreeForm ? Math.max(0, data.targetAmount - data.currentAmount) : null;
  }

  private getMaxAmountHint(data: SavingsMovementModalData): string {
    if (data.movementType !== MovementType.Withdrawal) return 'savingsGoalDetail.remainingToGoal';
    return data.progressionTypeId === ProgressionType.FreeForm
      ? 'savingsGoalDetail.availableToWithdraw'
      : 'savingsGoalDetail.availableBalance';
  }

  protected close(): void {
    this.visible.set(false);
    this.form.reset();
  }

  protected submit(): void {
    if (this.form.invalid || this.goalId === null) return;

    const values = this.form.value;
    const request = new CreateSavingsMovementApiRequest(
      +values.amount!,
      this.movementType(),
      values.description || undefined,
      values.date || undefined,
      values.accountId ? +values.accountId : undefined,
    );
    this.isSubmitting.set(true);

    this.savingsStore.createMovement(this.goalId, request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.alertService.showSuccess(
          this.translate.instant(
            this.movementType() === MovementType.Withdrawal
              ? 'savingsGoalDetail.withdrawalCreatedSuccess'
              : 'savingsGoalDetail.depositCreatedSuccess',
          ),
        );
        this.close();
        this.completed.emit();
      },
      error: (e) => {
        this.isSubmitting.set(false);
        this.alertService.showError(
          this.translate.instant(
            this.movementType() === MovementType.Withdrawal
              ? 'savingsGoalDetail.withdrawalCreatedError'
              : 'savingsGoalDetail.depositCreatedError',
          ),
        );
        throw e;
      },
    });
  }

  private todayAsString(): string {
    return new DatePipe('en-US').transform(new Date(), 'yyyy-MM-dd', 'UTC') as string;
  }
}
