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
import { useFinancialInstitutionsStore } from '../../store/financial-institutions.store';
import { InstitutionSelectorComponent } from '../institution-selector/institution-selector.component';
import { KeyValueViewModel } from '../../models/view/key-value-view-model';
import { LoanType, LoanTypeLabels, AmortizationType, AmortizationTypeLabels, Configurations, LoanDirection, FinancialInstitutionType } from '../../models/enums';
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
  administrativeFees: FormControl<number | null>;
  ivaPercentage: FormControl<number | null>;
  insuranceAmount: FormControl<number | null>;
  direction: FormControl<number>;
  totalRatePercentage: FormControl<number | null>;
}

// Guaraní: la cuota 'flat' se redondea hacia arriba a múltiplos de 1.000 (igual que la api)
const GUARANI_CURRENCY_ID = 4;
const GUARANI_ROUNDING_STEP = 1000;

@Component({
  selector: 'app-upsert-loan',
  templateUrl: './upsert-loan.component.html',
  styleUrls: ['./upsert-loan.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule, TranslateModule,
    TextComponent, SelectInputComponent, DateInputComponent, TextAreaInputComponent, InstitutionSelectorComponent,
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
  private financialInstitutionsStore = useFinancialInstitutionsStore();

  protected isEditMode = false;
  protected saving = signal(false);
  public ignorePreventUnsavedChanges = false;

  protected currencyList: KeyValueViewModel[] = [];

  // stream (no instant): si las traducciones todavía no cargaron, instant devuelve la clave
  private translations = toSignal(
    this.translate.stream([
      ...Object.values(LoanTypeLabels),
      ...Object.values(AmortizationTypeLabels),
      'upsertLoan.amortFrenchDesc',
      'upsertLoan.amortSimpleDesc',
      'upsertLoan.amortFlatDesc',
    ]),
    { initialValue: {} as Record<string, string> }
  );

  protected loanTypeList = computed(() => {
    const t = this.translations();
    return [LoanType.Personal, LoanType.Hipoteca, LoanType.Auto, LoanType.Tarjeta, LoanType.Informal].map(type =>
      new KeyValueViewModel(type, t[LoanTypeLabels[type]] ?? LoanTypeLabels[type], '')
    );
  });

  protected amortizationTypeList = computed(() => {
    const t = this.translations();
    return [
      new KeyValueViewModel(AmortizationType.French, t[AmortizationTypeLabels[AmortizationType.French]] ?? '', t['upsertLoan.amortFrenchDesc'] ?? ''),
      new KeyValueViewModel(AmortizationType.Simple, t[AmortizationTypeLabels[AmortizationType.Simple]] ?? '', t['upsertLoan.amortSimpleDesc'] ?? ''),
      new KeyValueViewModel(AmortizationType.Flat, t[AmortizationTypeLabels[AmortizationType.Flat]] ?? '', t['upsertLoan.amortFlatDesc'] ?? ''),
    ];
  });

  protected termList: KeyValueViewModel[] = [];

  protected calculatedInstallment = signal<number | null>(null);
  protected calculatedTotal = signal<number | null>(null);
  protected calculatedInterest = signal<number | null>(null);
  protected yieldInfo = signal<{
    installment: number;
    lastInstallment: number;
    totalInterest: number;
    totalAmount: number;
    ivaAmount: number;
    extraCosts: number;
    totalWithExtras: number;
    installmentWithExtras: number;
  } | null>(null);

  public formGroup: FormGroup<LoanFormGroup>;
  protected entityIdSignal!: ReturnType<typeof toSignal<number | null>>;
  protected isOtherEntity!: ReturnType<typeof computed<boolean>>;
  protected isLent!: ReturnType<typeof computed<boolean>>;
  protected isFlat!: ReturnType<typeof computed<boolean>>;
  protected LoanDirection = LoanDirection;

  constructor() {
    const today = new DatePipe('en-US').transform(new Date(), 'yyyy-MM-dd') as string;

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
      administrativeFees: new FormControl<number | null>(null),
      ivaPercentage: new FormControl<number | null>(null, [Validators.min(0), Validators.max(100)]),
      insuranceAmount: new FormControl<number | null>(null),
      direction: new FormControl<number>(LoanDirection.Borrowed, { nonNullable: true }),
      totalRatePercentage: new FormControl<number | null>(null),
    });

    this.entityIdSignal = toSignal(
      this.formGroup.controls.loanEntityId.valueChanges.pipe(
        startWith(this.formGroup.controls.loanEntityId.value)
      ),
      { initialValue: this.formGroup.controls.loanEntityId.value }
    );

    this.isOtherEntity = computed(() => {
      const entityId = this.entityIdSignal();
      return !!entityId && !!this.financialInstitutionsStore.financialInstitutionsById().get(entityId)?.isOther;
    });

    const directionSignal = toSignal(this.formGroup.controls.direction.valueChanges, { initialValue: this.formGroup.controls.direction.value });
    this.isLent = computed(() => +directionSignal() === LoanDirection.Lent);
    const amortizationSignal = toSignal(this.formGroup.controls.amortizationType.valueChanges, { initialValue: this.formGroup.controls.amortizationType.value });
    this.isFlat = computed(() => amortizationSignal() === AmortizationType.Flat);

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
    });

    // Prestamista (Otros) o deudor (préstamo otorgado): nombre obligatorio
    effect(() => {
      this.formGroup.controls.lenderCustomName.setValidators(
        this.isOtherEntity() || this.isLent() ? [Validators.required, Validators.maxLength(200)] : []
      );
      this.formGroup.controls.lenderCustomName.updateValueAndValidity();
    });

    // 'flat' usa tasa total sobre el capital; las demás, tasa anual
    effect(() => {
      const flat = this.isFlat();
      this.formGroup.controls.annualRatePercentage.setValidators(flat ? [] : [Validators.required, Validators.min(0), Validators.max(999)]);
      this.formGroup.controls.totalRatePercentage.setValidators(flat ? [Validators.required, Validators.min(0), Validators.max(999)] : []);
      this.formGroup.controls.annualRatePercentage.updateValueAndValidity({ emitEvent: false });
      this.formGroup.controls.totalRatePercentage.updateValueAndValidity({ emitEvent: false });
    });

    const recalc = () => this.recalculate();
    this.formGroup.controls.principalAmount.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(recalc);
    this.formGroup.controls.annualRatePercentage.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(recalc);
    this.formGroup.controls.numberOfInstallments.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.autoFillRate();
      recalc();
    });
    this.formGroup.controls.amortizationType.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(recalc);
    this.formGroup.controls.administrativeFees.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(recalc);
    this.formGroup.controls.ivaPercentage.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(recalc);
    this.formGroup.controls.insuranceAmount.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(recalc);
    this.formGroup.controls.totalRatePercentage.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(recalc);
    this.formGroup.controls.currencyId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(recalc);
    this.formGroup.controls.direction.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(direction => this.onDirectionChange(+direction));
  }

  protected setDirection(direction: LoanDirection): void {
    this.formGroup.controls.direction.setValue(direction);
  }

  // Un préstamo otorgado suele ser entre personas: tasa total ('flat'), tipo Informal,
  // entidad de tipo Persona y sin costos de banco
  private onDirectionChange(direction: number): void {
    if (this.isEditMode) return;
    const lent = direction === LoanDirection.Lent;
    this.formGroup.controls.loanTypeId.setValue(lent ? LoanType.Informal : LoanType.Personal);
    this.formGroup.controls.amortizationType.setValue(lent ? AmortizationType.Flat : AmortizationType.French);
    if (lent) {
      this.formGroup.patchValue({ administrativeFees: null, ivaPercentage: null, insuranceAmount: null });
      const person = this.financialInstitutionsStore.financialInstitutions().find(f => f.type === FinancialInstitutionType.Person);
      if (person && !this.formGroup.controls.loanEntityId.value) {
        this.formGroup.controls.loanEntityId.setValue(person.id);
      }
    }
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
    if (currentRate !== null && currentRate !== undefined) return;
    const terms = this.loansStore.entityTermsByEntity().get(entityId) ?? [];
    const match = terms.find(t => t.termMonths === +months);
    if (match) {
      this.formGroup.controls.annualRatePercentage.setValue(match.annualRatePercentage, { emitEvent: false });
    }
  }

  private recalculate(): void {
    const principal = this.formGroup.controls.principalAmount.value;
    const amortType = this.formGroup.controls.amortizationType.value;
    const rate = amortType === AmortizationType.Flat
      ? this.formGroup.controls.totalRatePercentage.value
      : this.formGroup.controls.annualRatePercentage.value;
    const n = this.formGroup.controls.numberOfInstallments.value;

    if (!principal || rate === null || rate === undefined || !n) {
      this.calculatedInstallment.set(null);
      this.calculatedTotal.set(null);
      this.calculatedInterest.set(null);
      this.yieldInfo.set(null);
      return;
    }

    let installment: number;
    let totalInterest: number;
    let totalAmount: number;
    // La última cuota absorbe el redondeo (ej. 1.000.000 en 3 → 333.333, 333.333, 333.334)
    let lastInstallment: number;

    if (amortType === AmortizationType.Flat) {
      // Igual que LoanCalculatorHelper.calculateFlat (api): la cuota redondeada hacia arriba es la real
      const step = +(this.formGroup.controls.currencyId.value ?? 0) === GUARANI_CURRENCY_ID ? GUARANI_ROUNDING_STEP : 1;
      const interest = Math.round(+principal * (+rate / 100));
      installment = Math.ceil((+principal + interest) / n / step) * step;
      totalAmount = installment * n;
      totalInterest = totalAmount - +principal;
      lastInstallment = installment;
    } else if (amortType === AmortizationType.Simple) {
      totalInterest = Math.round(+principal * (rate / 100) * (n / 12));
      totalAmount = +principal + totalInterest;
      // Igual que LoanCalculatorHelper.calculateSimple (api): redondeo hacia abajo
      const principalPerInstallment = Math.floor(+principal / n);
      const interestPerInstallment = Math.floor(totalInterest / n);
      installment = principalPerInstallment + interestPerInstallment;
      lastInstallment = totalAmount - installment * (n - 1);
    } else {
      // Igual que LoanCalculatorHelper.calculateFrench (api): la última cuota absorbe
      // el redondeo, así el total no queda corto (ej. 1.000.000 en 3 cuotas al 0%)
      const r = rate / 100 / 12;
      const pmt = r === 0
        ? +principal / n
        : (+principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      installment = Math.floor(pmt);
      let balance = +principal;
      totalAmount = 0;
      lastInstallment = installment;
      for (let i = 1; i <= n; i++) {
        const interest = Math.round(balance * r);
        const principalPaid = i < n ? installment - interest : balance;
        totalAmount += principalPaid + interest;
        balance -= principalPaid;
        if (i === n) lastInstallment = principalPaid + interest;
      }
      totalInterest = totalAmount - +principal;
    }

    const adminFees = +(this.formGroup.controls.administrativeFees.value ?? 0);
    const ivaPct = +(this.formGroup.controls.ivaPercentage.value ?? 0);
    const insurance = +(this.formGroup.controls.insuranceAmount.value ?? 0);
    const ivaAmount = Math.round(totalInterest * (ivaPct / 100));
    const extraCosts = adminFees + ivaAmount + insurance;
    const totalWithExtras = totalAmount + extraCosts;
    const installmentWithExtras = Math.floor(totalWithExtras / n);

    this.calculatedInstallment.set(installment);
    this.calculatedTotal.set(totalAmount);
    this.calculatedInterest.set(totalInterest);
    this.yieldInfo.set({ installment, lastInstallment, totalInterest, totalAmount, ivaAmount, extraCosts, totalWithExtras, installmentWithExtras });

    this.formGroup.controls.actualInstallmentAmount.setValue(installmentWithExtras, { emitEvent: false });
    this.formGroup.controls.actualTotalAmount.setValue(totalWithExtras, { emitEvent: false });
  }

  private loadLoanIntoForm(loan: any): void {
    const startDate = (loan.startDate as string).substring(0, 10);
    this.formGroup.patchValue({
      id: loan.id,
      name: loan.name,
      description: loan.description,
      currencyId: loan.currencyId,
      loanTypeId: loan.loanTypeId,
      lenderCustomName: loan.lenderCustomName,
      principalAmount: loan.principalAmount,
      annualRatePercentage: loan.annualRatePercentage,
      numberOfInstallments: loan.numberOfInstallments,
      actualInstallmentAmount: loan.actualInstallmentAmount,
      actualTotalAmount: loan.actualTotalAmount,
      amortizationType: loan.amortizationType,
      startDate,
      statusId: loan.statusId,
      administrativeFees: loan.administrativeFees ?? null,
      ivaPercentage: loan.ivaPercentage ?? null,
      insuranceAmount: loan.insuranceAmount ?? null,
      totalRatePercentage: loan.totalRatePercentage ?? null,
    }, { emitEvent: false });
    // Con evento para que isLent/isFlat se actualicen (onDirectionChange no actúa en edición)
    this.formGroup.controls.direction.setValue(loan.direction ?? LoanDirection.Borrowed);
    this.formGroup.controls.amortizationType.setValue(loan.amortizationType, { emitEvent: true });
    // Set loanEntityId with event so entityIdSignal receives the value before the control is disabled
    this.formGroup.controls.loanEntityId.setValue(loan.loanEntityId);
    this.formGroup.controls.principalAmount.disable();
    this.formGroup.controls.annualRatePercentage.disable();
    this.formGroup.controls.numberOfInstallments.disable();
    this.formGroup.controls.amortizationType.disable();
    this.formGroup.controls.totalRatePercentage.disable();
    this.formGroup.controls.direction.disable({ emitEvent: false });
    this.formGroup.controls.loanEntityId.disable({ emitEvent: false });
    this.recalculate();
    this.formGroup.controls.actualInstallmentAmount.setValue(loan.actualInstallmentAmount, { emitEvent: false });
    this.formGroup.controls.actualTotalAmount.setValue(loan.actualTotalAmount, { emitEvent: false });
  }

  protected save = (event?: Event): void => {
    event?.preventDefault();
    if (this.formGroup.invalid) { this.formGroup.markAllAsTouched(); return; }
    this.saving.set(true);
    const values = this.formGroup.getRawValue();
    this.formGroup.disable({ emitEvent: false });

    if (this.isEditMode) {
      const request = new UpdateLoanApiRequest(
        values.name!, values.description ?? null,
        +values.loanTypeId!, +(values.statusId ?? 1),
        this.toNumberOrNull(values.administrativeFees),
        this.toNumberOrNull(values.ivaPercentage),
        this.toNumberOrNull(values.insuranceAmount),
      );
      this.loansStore.updateLoan(values.id!, request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.ignorePreventUnsavedChanges = true;
          this.alertService.showSuccess(this.translate.instant('upsertLoan.updatedSuccess'));
          this.exit();
        },
        error: (e) => {
          this.formGroup.enable({ emitEvent: false });
          this.saving.set(false);
          this.alertService.showError(this.translate.instant('upsertLoan.updatedError'));
          throw e;
        },
      });
    } else {
      // Los inputs de app-text devuelven string: convertir antes de enviar
      const request = new CreateLoanApiRequest(
        +values.currencyId!, +values.loanTypeId!, +values.loanEntityId!,
        values.lenderCustomName ?? null, values.name!, values.description ?? null,
        +values.principalAmount!, this.toNumberOrNull(values.annualRatePercentage) ?? 0, +values.numberOfInstallments!,
        this.toNumberOrNull(values.actualInstallmentAmount), this.toNumberOrNull(values.actualTotalAmount),
        values.amortizationType!, values.startDate!,
        this.toNumberOrNull(values.administrativeFees),
        this.toNumberOrNull(values.ivaPercentage),
        this.toNumberOrNull(values.insuranceAmount),
        +values.direction,
        values.amortizationType === AmortizationType.Flat ? this.toNumberOrNull(values.totalRatePercentage) : null,
      );
      this.loansStore.createLoan(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.ignorePreventUnsavedChanges = true;
          this.alertService.showSuccess(this.translate.instant('upsertLoan.createdSuccess'));
          this.exit();
        },
        error: (e) => {
          this.formGroup.enable({ emitEvent: false }); this.saving.set(false);
          this.alertService.showError(this.translate.instant('upsertLoan.createdError'));
          throw e;
        },
      });
    }
  };

  private toNumberOrNull = (value: number | string | null | undefined): number | null =>
    value === null || value === undefined || value === '' ? null : +value;

  protected cancel = (): void => { this.exit(); };
  protected exit = (): void => { this.router.navigate(['/loans']); };
  protected formatCurrency = this.formatterService.formatCurrency;
}
