import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, EventEmitter, Output, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { useSavingsStore } from '../../store';
import { AlertService, FormatterHelperService } from '../../services';
import { MovementType } from '../../models/enums';
import { CreateMutualFundMovementApiRequest } from '../../models/api/savings';
import { TextComponent } from '../inputs/text/text.component';
import { TextAreaInputComponent } from '../inputs/text-area-input/text-area-input.component';
import { DateInputComponent } from '../inputs/date-input/date-input.component';
import { SavingsCalculatorHelper } from '../../services/helpers/savings-calculator-helper.service';

export interface MutualFundMovementModalData {
  goalId: number;
  currencyId: number;
  currentAmount: number;
  annualRatePercentage: number | null;
  startDate: Date | string;
  movementType: number;
}

interface MutualFundMovementFormGroup {
  amount: FormControl<number | null>;
  description: FormControl<string | null>;
  date: FormControl<string | null>;
}

@Component({
  selector: 'app-mutual-fund-movement-modal',
  templateUrl: './mutual-fund-movement-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    TextComponent,
    TextAreaInputComponent,
    DateInputComponent,
  ],
})
export class MutualFundMovementModalComponent {
  private destroyRef = inject(DestroyRef);
  private alertService = inject(AlertService);
  private translate = inject(TranslateService);
  private formatterService = inject(FormatterHelperService);
  private savingsStore = useSavingsStore();

  private goalId: number | null = null;

  @Output() completed = new EventEmitter<void>();

  protected visible = signal(false);
  protected isSubmitting = signal(false);
  protected movementType = signal<number>(MovementType.Deposit);
  protected currencyId = signal<number>(1);
  protected maxWithdrawal = signal<number>(0);
  protected form: FormGroup<MutualFundMovementFormGroup>;

  protected MovementType = MovementType;
  protected formatCurrency = this.formatterService.formatCurrency.bind(this.formatterService);

  constructor() {
    this.form = new FormGroup<MutualFundMovementFormGroup>({
      amount: new FormControl(null, [Validators.required, Validators.min(1)]),
      description: new FormControl(''),
      date: new FormControl(this.todayAsString(), [Validators.required]),
    });
  }

  public open(data: MutualFundMovementModalData): void {
    this.goalId = data.goalId;
    this.currencyId.set(data.currencyId);
    this.movementType.set(data.movementType);

    this.form.reset();
    this.form.patchValue({ amount: null, description: '', date: this.todayAsString() });

    this.form.controls.amount.clearValidators();
    this.form.controls.amount.addValidators([Validators.required, Validators.min(1)]);

    if (data.movementType === MovementType.Withdrawal) {
      const maxWithdrawal = SavingsCalculatorHelper.calculateMutualFundMaxWithdrawal(
        data.currentAmount,
        data.annualRatePercentage,
        data.startDate,
      );
      this.maxWithdrawal.set(maxWithdrawal);
      this.form.controls.amount.addValidators(Validators.max(maxWithdrawal));
    } else {
      this.maxWithdrawal.set(0);
    }
    this.form.controls.amount.updateValueAndValidity();

    this.visible.set(true);
  }

  protected close(): void {
    this.visible.set(false);
    this.form.reset();
  }

  protected submit(): void {
    if (this.form.invalid || this.goalId === null) return;

    const values = this.form.value;
    const request = new CreateMutualFundMovementApiRequest(
      +values.amount!,
      this.movementType(),
      values.description || undefined,
      values.date || undefined,
    );
    this.isSubmitting.set(true);

    this.savingsStore.createMutualFundMovement(this.goalId, request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
