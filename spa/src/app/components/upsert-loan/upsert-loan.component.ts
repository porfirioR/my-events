import { CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit,
  inject, effect, computed, signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { startWith } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { TextComponent } from '../inputs/text/text.component';
import { SelectInputComponent } from '../inputs/select-input/select-input.component';
import { DateInputComponent } from '../inputs/date-input/date-input.component';
import { TextAreaInputComponent } from '../inputs/text-area-input/text-area-input.component';
import { AlertService, FormatterHelperService } from '../../services';
import { useCurrencyStore } from '../../store/currency.store';
import { useLoansStore } from '../../store/loans.store';
import { KeyValueViewModel } from '../../models/view/key-value-view-model';
import { LoanEntity, LoanEntityLabels, LoanType, LoanTypeLabels, AmortizationType, AmortizationTypeLabels, Configurations } from '../../models/enums';
import { CreateLoanApiRequest, UpdateLoanApiRequest } from '../../models/api/loans';

interface LoanFormGroup {
  id: FormControl<number | null>;
  name: FormControl<string | null>;
  description: FormControl<string | null>;
  currencyId: FormControl<number | null>;
  loanTypeId: FormControl<number | null>;
  loanEntityId: FormControl<number | null>;
  lenderCustomName: FormControl<string | null>;
  principalAmount: FormControl<number | null>;
  annualRatePercentage: FormControl<number | null>;
  numberOfInstallments: FormControl<number | null>;
  actualInstallmentAmount: FormControl<number | null>;
  actualTotalAmount: FormControl<number | null>;
  amortizationType: FormControl<string | null>;
  startDate: FormControl<string | null>;
  statusId: FormControl<number | null>;
}

@Component({
  selector: 'app-upsert-loan',
  templateUrl: './upsert-loan.component.html',
  styleUrls: ['./upsert-loan.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule, TranslateModule,
    TextComponent, SelectInputComponent, DateInputComponent, TextAreaInputComponent,
  ],
})
export class UpsertLoanComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private alertService = inject(AlertService);
  private formatterService = inject(FormatterHelperService);
  private translate = inject(TranslateService);
  private loansStore = useLoansStore();
  private currencyStore = useCurrencyStore();

  protected isEditMode = false;
  protected saving = false;
  public ignorePreventUnsavedChanges = false;

  protected LoanEntity = LoanEntity;
  protected currencyList: KeyValueViewModel[] = [];

  protected loanTypeList: KeyValueViewModel[] = [
    new KeyValueViewModel(LoanType.Personal, this.translate.instant(LoanTypeLabels[LoanType.Personal]), ''),
    new KeyValueViewModel(LoanType.Hipoteca, this.translate.instant(LoanTypeLabels[LoanType.Hipoteca]), ''),
    new KeyValueViewModel(LoanType.Auto, this.translate.instant(LoanTypeLabels[LoanType.Auto]), ''),
    new KeyValueViewModel(LoanType.Tarjeta, this.translate.instant(LoanTypeLabels[LoanType.Tarjeta]), ''),
    new KeyValueViewModel(LoanType.Informal, this.translate.instant(LoanTypeLabels[LoanType.Informal]), ''),
  ];

  protected loanEntityList: KeyValueViewModel[] = [
    new KeyValueViewModel(LoanEntity.Ueno, LoanEntityLabels[LoanEntity.Ueno], ''),
    new KeyValueViewModel(LoanEntity.Itau, LoanEntityLabels[LoanEntity.Itau], ''),
    new KeyValueViewModel(LoanEntity.Personal, LoanEntityLabels[LoanEntity.Personal], ''),
    new KeyValueViewModel(LoanEntity.Otros, this.translate.instant(LoanEntityLabels[LoanEntity.Otros]), ''),
  ];

  protected amortizationTypeList: KeyValueViewModel[] = [
    new KeyValueViewModel(AmortizationType.French, this.translate.instant(AmortizationTypeLabels[AmortizationType.French]), this.translate.instant('upsertLoan.amortFrenchDesc')),
    new KeyValueViewModel(AmortizationType.Simple, this.translate.instant(AmortizationTypeLabels[AmortizationType.Simple]), this.translate.instant('upsertLoan.amortSimpleDesc')),
  ];

  protected termList: KeyValueViewModel[] = [];

  protected calculatedInstallment = signal<number | null>(null);
  protected calculatedTotal = signal<number | null>(null);
  protected calculatedInterest = signal<number | null>(null);
  protected yieldInfo = signal<{ installment: number; totalInterest: number; totalAmount: number } | null>(null);

  public formGroup: FormGroup<LoanFormGroup>;
  protected entityIdSignal!: ReturnType<typeof toSignal<number | null>>;
  protected isOtherEntity!: ReturnType<typeof computed<boolean>>;

  constructor() {
    const today = new DatePipe('en-US').transform(new Date(), 'yyyy-MM-dd', 'UTC') as string;

    this.formGroup = new FormGroup<LoanFormGroup>({
      id: new FormControl(null),
      name: new FormControl('', [Validators.required, Validators.maxLength(200)]),
      description: new FormControl('', [Validators.maxLength(500)]),
      currencyId: new FormControl(null, [Validators.required]),
      loanTypeId: new FormControl(LoanType.Personal, [Validators.required]),
      loanEntityId: new FormControl(null, [Validators.required]),
      lenderCustomName: new FormControl(null),
      principalAmount: new FormControl(null, [Validators.required, Validators.min(1)]),
      annualRatePercentage: new FormControl(null, [Validators.required, Validators.min(0), Validators.max(999)]),
      numberOfInstallments: new FormControl(null, [Validators.required, Validators.min(1)]),
      actualInstallmentAmount: new FormControl(null),
      actualTotalAmount: new FormControl(null),
      amortizationType: new FormControl(AmortizationType.French, [Validators.required]),
      startDate: new FormControl(today, [Validators.required]),
      statusId: new FormControl(1),
    });

    this.entityIdSignal = toSignal(
      this.formGroup.controls.loanEntityId.valueChanges.pipe(
        startWith(this.formGroup.controls.loanEntityId.value)
      ),
      { initialValue: this.formGroup.controls.loanEntityId.value }
    );

    this.isOtherEntity = computed(() => this.entityIdSignal() === LoanEntity.Otros);

    effect(() => {
      const currencies = this.currencyStore.getAllCurrencies();
      if (currencies.length > 0) {
        this.currencyList = this.formatterService.convertToList(currencies, Configurations.Currencies);
      }
    });

    effect(() => {
      const goal = this.loansStore.selectedLoan();
      const hasCurrencies = this.currencyStore.isLoaded();
      if (goal && this.isEditMode && hasCurrencies) {
        this.loadLoanIntoForm(goal);
      }
    });

    effect(() => {
      const entityId = this.entityIdSignal();
      if (!entityId) { this.termList = []; return; }
      const terms = this.loansStore.entityTermsByEntity().get(entityId) ?? [];
      const months = this.translate.instant('upsertLoan.months');
      this.termList = terms.map(t =>
        new KeyValueViewModel(t.termMonths, `${t.termMonths} ${months}`, `${this.translate.instant('upsertLoan.suggestedRate')}: ${t.annualRatePercentage}%`)
      );
      this.formGroup.controls.lenderCustomName.setValidators(
        entityId === LoanEntity.Otros ? [Validators.required, Validators.maxLength(200)] : []
      );
      this.formGroup.controls.lenderCustomName.updateValueAndValidity();
    });

    const recalc = () => this.recalculate();
    this.formGroup.controls.principalAmount.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(recalc);
    this.formGroup.controls.annualRatePercentage.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(recalc);
    this.formGroup.controls.numberOfInstallments.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.autoFillRate();
      recalc();
    });
    this.formGroup.controls.amortizationType.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(recalc);
  }

  ngOnInit(): void {
    const id = this.activatedRoute.snapshot.params['id'];
    if (id) {
      this.isEditMode = true;
      this.loansStore.loadLoanById(+id);
    } else {
      this.loansStore.clearSelectedLoan();
    }
    this.currencyStore.loadCurrencies();
    this.loansStore.loadEntityTerms();
  }

  private autoFillRate(): void {
    const entityId = this.entityIdSignal();
    const months = this.formGroup.controls.numberOfInstallments.value;
    if (!entityId || !months) return;
    const currentRate = this.formGroup.controls.annualRatePercentage.value;
    if (currentRate) return;
    const terms = this.loansStore.entityTermsByEntity().get(entityId) ?? [];
    const match = terms.find(t => t.termMonths === +months);
    if (match) {
      this.formGroup.controls.annualRatePercentage.setValue(match.annualRatePercentage, { emitEvent: false });
    }
  }

  private recalculate(): void {
    const principal = this.formGroup.controls.principalAmount.value;
    const rate = this.formGroup.controls.annualRatePercentage.value;
    const n = this.formGroup.controls.numberOfInstallments.value;
    const amortType = this.formGroup.controls.amortizationType.value;

    if (!principal || !rate || !n) {
      this.calculatedInstallment.set(null);
      this.calculatedTotal.set(null);
      this.calculatedInterest.set(null);
      this.yieldInfo.set(null);
      return;
    }

    let installment: number;
    let totalInterest: number;
    let totalAmount: number;

    if (amortType === AmortizationType.Simple) {
      totalInterest = Math.round(+principal * (rate / 100) * (n / 12));
      totalAmount = +principal + totalInterest;
      installment = Math.round(totalAmount / n);
    } else {
      const r = rate / 100 / 12;
      if (r === 0) {
        installment = Math.round(+principal / n);
      } else {
        installment = Math.round((+principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
      }
      totalAmount = installment * n;
      totalInterest = totalAmount - +principal;
    }

    this.calculatedInstallment.set(installment);
    this.calculatedTotal.set(totalAmount);
    this.calculatedInterest.set(totalInterest);
    this.yieldInfo.set({ installment, totalInterest, totalAmount });

    if (!this.formGroup.controls.actualInstallmentAmount.value) {
      this.formGroup.controls.actualInstallmentAmount.setValue(installment, { emitEvent: false });
    }
    if (!this.formGroup.controls.actualTotalAmount.value) {
      this.formGroup.controls.actualTotalAmount.setValue(totalAmount, { emitEvent: false });
    }
  }

  private loadLoanIntoForm(loan: any): void {
    const startDate = new DatePipe('en-US').transform(new Date(loan.startDate), 'yyyy-MM-dd', 'UTC') as string;
    this.formGroup.patchValue({
      id: loan.id,
      name: loan.name,
      description: loan.description,
      currencyId: loan.currencyId,
      loanTypeId: loan.loanTypeId,
      loanEntityId: loan.loanEntityId,
      lenderCustomName: loan.lenderCustomName,
      principalAmount: loan.principalAmount,
      annualRatePercentage: loan.annualRatePercentage,
      numberOfInstallments: loan.numberOfInstallments,
      actualInstallmentAmount: loan.actualInstallmentAmount,
      actualTotalAmount: loan.actualTotalAmount,
      amortizationType: loan.amortizationType,
      startDate,
      statusId: loan.statusId,
    });
    this.formGroup.controls.principalAmount.disable();
    this.formGroup.controls.annualRatePercentage.disable();
    this.formGroup.controls.numberOfInstallments.disable();
    this.formGroup.controls.amortizationType.disable();
    this.formGroup.controls.loanEntityId.disable();
    this.recalculate();
    this.formGroup.controls.actualInstallmentAmount.setValue(loan.actualInstallmentAmount, { emitEvent: false });
    this.formGroup.controls.actualTotalAmount.setValue(loan.actualTotalAmount, { emitEvent: false });
  }

  protected save = (event?: Event): void => {
    event?.preventDefault();
    if (this.formGroup.invalid) { this.formGroup.markAllAsTouched(); return; }
    this.saving = true;
    const values = this.formGroup.getRawValue();
    this.formGroup.disable({ emitEvent: false });

    if (this.isEditMode) {
      const request = new UpdateLoanApiRequest(
        values.name!, values.description ?? null,
        values.loanTypeId!, values.statusId ?? 1,
      );
      this.loansStore.updateLoan(values.id!, request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.ignorePreventUnsavedChanges = true;
          this.alertService.showSuccess(this.translate.instant('upsertLoan.updatedSuccess'));
          this.exit();
        },
        error: (e) => { this.formGroup.enable({ emitEvent: false }); this.saving = false; throw e; },
      });
    } else {
      const request = new CreateLoanApiRequest(
        values.currencyId!, values.loanTypeId!, values.loanEntityId!,
        values.lenderCustomName ?? null, values.name!, values.description ?? null,
        values.principalAmount!, values.annualRatePercentage!, values.numberOfInstallments!,
        values.actualInstallmentAmount ?? null, values.actualTotalAmount ?? null,
        values.amortizationType!, values.startDate!,
      );
      this.loansStore.createLoan(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.ignorePreventUnsavedChanges = true;
          this.alertService.showSuccess(this.translate.instant('upsertLoan.createdSuccess'));
          this.exit();
        },
        error: (e) => {
          this.formGroup.enable({ emitEvent: false }); this.saving = false;
          this.alertService.showError(this.translate.instant('upsertLoan.createdError'));
          throw e;
        },
      });
    }
  };

  protected cancel = (): void => this.exit();
  protected exit = (): void => this.router.navigate(['/loans']);
  protected formatCurrency = this.formatterService.formatCurrency;
}
