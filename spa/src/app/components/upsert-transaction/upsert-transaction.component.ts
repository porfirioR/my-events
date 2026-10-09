import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, signal, computed, inject, Signal, effect } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Location } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { useCollaboratorStore, useCurrencyStore, useLoadingStore, useTransactionStore } from '../../store';
import { Configurations, ParticipantType, SplitType, WhoPaid } from '../../models/enums';
import { CreateTransactionApiRequest, ReimbursementApiRequest, TransactionApiModel, TransactionSplitApiRequest, TransactionViewApiModel } from '../../models/api/transactions';
import { ReimbursementFormGroup, TransactionFormGroup, TransactionSplitFormGroup } from '../../models/forms';
import { AlertService, FormatterHelperService, LocalService } from '../../services';
import { SelectInputComponent } from '../inputs/select-input/select-input.component';
import { KeyValueViewModel, TransactionEntryPreferencesViewModel, TransactionSplitPlanViewModel } from '../../models/view';
import { PaymentDirectionType, TransactionEntryModes, TransactionEntryModeType } from '../../constants';
import { TextComponent } from '../inputs/text/text.component';
import { TextAreaInputComponent } from '../inputs/text-area-input/text-area-input.component';
import { CheckBoxInputComponent } from '../inputs/check-box-input/check-box-input.component';
import { debounceTime, startWith, tap } from 'rxjs';

@Component({
  selector: 'app-upsert-transaction',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    TranslateModule,
    SelectInputComponent,
    TextComponent,
    TextAreaInputComponent,
    CheckBoxInputComponent
  ],
  templateUrl: './upsert-transaction.component.html',
  styleUrls: ['./upsert-transaction.component.css']
})
export class UpsertTransactionComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly alertService = inject(AlertService);
  private readonly translate = inject(TranslateService);
  private formatterService = inject(FormatterHelperService);
  private readonly localService = inject(LocalService);

  private readonly transactionStore = useTransactionStore();
  private readonly collaboratorStore = useCollaboratorStore();
  private readonly currencyStore = useCurrencyStore();
  private loadingStore = useLoadingStore();
  protected isLoading = this.loadingStore.isLoading;
  protected selectedTransaction = this.transactionStore.selectedTransaction;
  private transaction: TransactionApiModel | undefined;

  // Signals
  protected isSubmitting = signal<boolean>(false);
  protected errorMessage = signal<string | null>(null);
  protected customUserAmount = signal<number>(0);
  protected customCollaboratorAmount = signal<number>(0);
  protected mode = signal<TransactionEntryModeType>('expense');
  protected paymentDirection = signal<PaymentDirectionType>('theyPaidMe');
  protected entryModes = TransactionEntryModes;
  private preferredCollaboratorId: number | null = null;

  // Form
  public formGroup: FormGroup<TransactionFormGroup>
  public ignorePreventUnsavedChanges = false
  protected isEditMode = false;
  private transactionId?: number;

  // Computed
  protected linkedCollaborators: Signal<KeyValueViewModel[]> = computed(() => {
    const linkedCollaborators = this.collaboratorStore.linkedCollaborators()
    return this.formatterService.convertToList(linkedCollaborators, Configurations.Collaborator)
  });
  protected splitType = SplitType
  protected whoPaid = WhoPaid
  // Nombre de la persona elegida, para usar en textos ("Leti pagó")
  protected collaboratorName: Signal<string>;

  private getTodayDateString(): string {
    // Fecha local (toISOString usa UTC y de noche devolvía el día siguiente)
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${today.getFullYear()}-${month}-${day}`;
  }

  constructor() {
    const reimbursement = new FormGroup<ReimbursementFormGroup>({
      amount: new FormControl(null),
      description: new FormControl(null)
    })
    this.formGroup = new FormGroup<TransactionFormGroup>({
      collaboratorId: new FormControl(null, [Validators.required]),
      totalAmount: new FormControl(null, [Validators.required, Validators.min(0)]),
      description: new FormControl(null, [Validators.required]),
      transactionDate: new FormControl(this.getTodayDateString(), [Validators.required]),
      splitType: new FormControl(SplitType.Equal, [Validators.required]),
      whoPaid: new FormControl(WhoPaid.User, [Validators.required]),
      splits: new FormArray<FormGroup<TransactionSplitFormGroup>>([]),
      hasReimbursement: new FormControl(false),
      reimbursement: reimbursement
    });

    // Watch for changes in totalAmount to recalculate splits
    this.formGroup.controls.totalAmount.valueChanges.pipe(
      tap(() => {
        this.customUserAmount.set(0);
        this.customCollaboratorAmount.set(0);
        this.formGroup.controls.reimbursement.controls.amount.reset();
        this.formGroup.controls.reimbursement.controls.amount.clearValidators();
      }),
      debounceTime(100),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((totalAmount) => {
      this.recalculateSplits(this.formGroup.value.splitType!);
      if (totalAmount) {
        this.formGroup.controls.reimbursement.controls.amount.addValidators([Validators.max(totalAmount)])
      }
      this.formGroup.controls.reimbursement.updateValueAndValidity()
    });
    this.formGroup.controls.splitType.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(splitType => {
      this.recalculateSplits(splitType!);
    });
    this.formGroup.controls.hasReimbursement.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(x => this.onReimbursementToggle(x));

    const collaboratorId = toSignal(
      this.formGroup.controls.collaboratorId.valueChanges.pipe(startWith(this.formGroup.controls.collaboratorId.value)),
    );
    this.collaboratorName = computed(() => {
      const id = Number(collaboratorId());
      const collaborator = this.collaboratorStore.linkedCollaborators().find(x => x.id === id);
      return collaborator?.name || this.translate.instant('upsertTransaction.otherPerson');
    });

    // Preseleccionar persona: query param > última usada > única disponible
    effect(() => {
      const collaborators = this.collaboratorStore.linkedCollaborators();
      const control = this.formGroup.controls.collaboratorId;
      if (this.isEditMode || control.value || collaborators.length === 0) return;
      const preferred = collaborators.find(x => x.id === this.preferredCollaboratorId);
      const selected = preferred ?? (collaborators.length === 1 ? collaborators[0] : undefined);
      if (selected) control.setValue(selected.id);
    });

    effect(() => {
      this.transaction = this.selectedTransaction();
      if (this.transaction && this.isEditMode) {
        const dateStr = this.transaction.transactionDate
          ? new Date(this.transaction.transactionDate).toISOString().split('T')[0]
          : this.getTodayDateString();
        this.formGroup.patchValue({
          collaboratorId: this.transaction.collaboratorId,
          totalAmount: this.transaction.totalAmount,
          description: this.transaction.description,
          transactionDate: dateStr,
          splitType: this.transaction.splitType,
          whoPaid: this.transaction.whoPaid,
          hasReimbursement: !!this.transaction.totalReimbursement,
        });
      }
    });
  }

  ngOnInit(): void {
    this.checkEditMode();
    this.initEntryMode();
    this.loadCollaborators();
    this.currencyStore.loadCurrencies();
  }

  // ========== Entry Mode ==========
  private initEntryMode(): void {
    if (this.isEditMode) {
      this.setMode('shared', false);
      return;
    }
    const preferences = this.localService.getTransactionEntryPreferences();
    const queryParams = this.route.snapshot.queryParamMap;
    const queryMode = queryParams.get('mode') as TransactionEntryModeType | null;
    const queryCollaboratorId = Number(queryParams.get('collaboratorId'));

    this.preferredCollaboratorId = queryCollaboratorId || preferences?.collaboratorId || null;
    const mode = queryMode && TransactionEntryModes.includes(queryMode) ? queryMode : preferences?.mode ?? 'expense';
    this.setMode(mode, false);
  }

  protected setMode(mode: TransactionEntryModeType, persist = true): void {
    this.mode.set(mode);
    const description = this.formGroup.controls.description;
    // En pagos la descripción es opcional (se usa "Pago" por defecto)
    description.setValidators(mode === 'payment' ? [] : [Validators.required]);
    description.updateValueAndValidity();

    if (mode === 'payment' && this.formGroup.value.hasReimbursement) {
      this.formGroup.controls.hasReimbursement.setValue(false);
    }
    if (persist) this.savePreferences();
  }

  protected setPaymentDirection(direction: PaymentDirectionType): void {
    this.paymentDirection.set(direction);
  }

  private savePreferences(): void {
    this.localService.setTransactionEntryPreferences(
      new TransactionEntryPreferencesViewModel(this.mode(), this.formGroup.value.collaboratorId ?? null)
    );
  }

  private checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.transactionId = parseInt(id);
      this.transactionStore.loadTransactionById(this.transactionId)
    }
  }

  private loadCollaborators(): void {
    if (this.collaboratorStore.totalCount() === 0) {
      this.collaboratorStore.loadCollaborators();
    }
  }

  // ========== Split Type Handlers ==========
  protected setSplitType(type: SplitType): void {
    this.formGroup.patchValue({ splitType: type });
    this.recalculateSplits(type);
  }

  protected setWhoPaid(who: WhoPaid): void {
    this.formGroup.patchValue({ whoPaid: who });
  }

  private recalculateSplits(splitType: SplitType): void {
    const netAmount = this.calculateNetAmount();

    switch (splitType) {
      case this.splitType.Equal:
        const half = netAmount / 2;
        this.customUserAmount.set(half);
        break;
      case this.splitType.Custom:
        const value = netAmount / 2;
        this.customUserAmount.set(value);
        this.customCollaboratorAmount.set(value);
        break;
      case this.splitType.Percentage:
        this.customUserAmount.set(50);
        this.customCollaboratorAmount.set(50);
        break;
      default:
        break;
    }
  }

  protected onCustomUserAmountChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const [value, maxValue] = this.getValueAndMaxValue(input.value)

    this.customUserAmount.set(value);
    this.customCollaboratorAmount.set(maxValue - value);
    input.value = value.toString()
  }

  protected onCustomCollaboratorAmountChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const [value, maxValue] = this.getValueAndMaxValue(input.value)

    this.customCollaboratorAmount.set(value);
    this.customUserAmount.set(maxValue - value);
    input.value = value.toString()
  }

  private getValueAndMaxValue(inputValue: string):[number, number] {
    let value = parseInt(inputValue) || 0;

    const splitType = this.formGroup.value.splitType;
    const netAmount = this.calculateNetAmount();

    let maxValue = 100
    if (splitType === this.splitType.Custom) {
      maxValue = netAmount
      if (value > netAmount) {
        value = netAmount
      }
    } else if(splitType === this.splitType.Percentage && value > maxValue) {
      value = maxValue
    }
    return [value, maxValue]
  }

  // ========== Calculations ==========
  protected calculateNetAmount(): number {
    const totalAmount = this.formGroup.value.totalAmount || 0;
    const hasReimbursement = this.formGroup.value.hasReimbursement;
    const reimbursementAmount = hasReimbursement ? (this.formGroup.controls.reimbursement.value.amount || 0) : 0;
    return totalAmount - reimbursementAmount;
  }

  protected calculateMySplit(): number {
    const netAmount = this.calculateNetAmount();

    switch (this.formGroup.value.splitType) {
      case this.splitType.Equal:
        return netAmount / 2;
      case this.splitType.Custom:
        return this.customUserAmount();
      case this.splitType.Percentage:
        return (netAmount * this.customUserAmount()) / 100;
      default:
        return 0;
    }
  }

  protected calculateTheirSplit(): number {
    const netAmount = this.calculateNetAmount();
    switch (this.formGroup.value.splitType) {
      case this.splitType.Equal:
        return netAmount / 2;
      case this.splitType.Custom:
        return this.customCollaboratorAmount();
      case this.splitType.Percentage:
        return (netAmount * this.customCollaboratorAmount()) / 100;
      default:
        return 0;
    }
  }

  // ========== NUEVOS MÉTODOS: Cálculo de Deudas ==========
  
  /**
   * Calcula cuánto DEBO yo al colaborador
   */
  protected calculateMyDebt(): number {
    const whoPaid = this.formGroup.value.whoPaid;
    
    if (whoPaid === WhoPaid.User) {
      // Si yo pagué, no debo nada
      return 0;
    }
    
    // Si ellos pagaron, yo les debo MI parte (lo que me corresponde pagar)
    return this.calculateMySplit();
  }

  /**
   * Calcula cuánto me DEBE el colaborador
   */
  protected calculateTheirDebt(): number {
    const whoPaid = this.formGroup.value.whoPaid;
    
    if (whoPaid === WhoPaid.Collaborator) {
      // Si ellos pagaron, no me deben nada
      return 0;
    }
    
    // Si yo pagué, ellos me deben SU parte (lo que les corresponde pagar)
    return this.calculateTheirSplit();
  }

  /**
   * Calcula el balance neto (positivo = me deben, negativo = yo debo)
   */
  protected calculateNetBalance(): number {
    return this.calculateTheirDebt() - this.calculateMyDebt();
  }

  /**
   * Retorna un mensaje descriptivo del balance
   */
  protected getBalanceMessage(): string {
    const netBalance = this.calculateNetBalance();
    
    if (netBalance > 0) {
      return this.translate.instant('upsertTransaction.theyOweYouBalance', {
        amount: this.formatCurrency(netBalance)
      });
    } else if (netBalance < 0) {
      return this.translate.instant('upsertTransaction.youOweThemBalance', {
        amount: this.formatCurrency(Math.abs(netBalance))
      });
    } else {
      return this.translate.instant('upsertTransaction.balanced', {
        amount: this.formatCurrency(0)
      });
    }
  }

  // ========== Reimbursement ==========
  private onReimbursementToggle(hasReimbursement: boolean | null): void {
    const reimbursementGroup = this.formGroup.controls.reimbursement;

    if (hasReimbursement) {
      reimbursementGroup.controls.amount.setValidators([
        Validators.required,
        Validators.min(1),
        Validators.max(this.formGroup.value.totalAmount || 0)
      ]);
    } else {
      reimbursementGroup.controls.amount.clearValidators();
      reimbursementGroup.reset();
    }

    reimbursementGroup.controls.amount.updateValueAndValidity();
    this.recalculateSplits(this.formGroup.value.splitType!);
  }

  // ========== Submit ==========
  /**
   * Arma quién pagó y cuánto le corresponde a cada uno según el modo.
   * expense y payment usan Percentage 100/0, igual que las transacciones cargadas a mano.
   */
  private buildSplitPlan(): TransactionSplitPlanViewModel {
    const netAmount = this.calculateNetAmount();
    switch (this.mode()) {
      case 'expense':
        return new TransactionSplitPlanViewModel(WhoPaid.User, SplitType.Percentage, 0, netAmount, 0, 100);
      case 'payment':
        // Pago recibido = la otra persona "pagó" el 100% por mí → descuenta de su deuda
        return this.paymentDirection() === 'theyPaidMe'
          ? new TransactionSplitPlanViewModel(WhoPaid.Collaborator, SplitType.Percentage, netAmount, 0, 100, 0)
          : new TransactionSplitPlanViewModel(WhoPaid.User, SplitType.Percentage, 0, netAmount, 0, 100);
      default: {
        const isPercentage = this.formGroup.value.splitType === SplitType.Percentage;
        return new TransactionSplitPlanViewModel(
          this.formGroup.value.whoPaid!,
          this.formGroup.value.splitType!,
          this.calculateMySplit(),
          this.calculateTheirSplit(),
          isPercentage ? this.customUserAmount() : undefined,
          isPercentage ? this.customCollaboratorAmount() : undefined,
        );
      }
    }
  }

  protected onSubmit(addAnother = false): void {
    if (this.formGroup.invalid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const formValue = this.formGroup.value;
    const netAmount = this.calculateNetAmount();
    const plan = this.buildSplitPlan();

    if (Math.abs(plan.mySplit + plan.theirSplit - netAmount) > 0.01) {
      this.errorMessage.set(
        this.translate.instant('upsertTransaction.debtAmountsError')
      );
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const splits: TransactionSplitApiRequest[] = [
      {
        participantType: ParticipantType.User,
        amount: plan.mySplit,
        isPayer: plan.whoPaid === WhoPaid.User,
        sharePercentage: plan.myPercentage,
      },
      {
        participantType: ParticipantType.Collaborator,
        amount: plan.theirSplit,
        isPayer: plan.whoPaid === WhoPaid.Collaborator,
        sharePercentage: plan.theirPercentage,
      }
    ];

    // Create reimbursement if needed
    let reimbursement: ReimbursementApiRequest | null = null;
    if (this.mode() !== 'payment' && formValue.hasReimbursement && formValue.reimbursement?.amount! > 0) {
      reimbursement = new ReimbursementApiRequest(
        +formValue.reimbursement?.amount!,
        formValue.reimbursement?.description
      );
    }

    const description = formValue.description?.trim()
      || (this.mode() === 'payment' ? this.translate.instant('upsertTransaction.paymentDefaultDescription') : '');

    // Create request
    const request = new CreateTransactionApiRequest(
      formValue.collaboratorId!,
      +formValue.totalAmount!,
      description,
      plan.splitType,
      plan.whoPaid,
      splits,
      reimbursement,
      formValue.transactionDate ?? null,
    );

    // Submit
    this.transactionStore.createTransaction(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.alertService.showSuccess(
          this.translate.instant('upsertTransaction.transactionCreatedSuccess')
        );
        this.transactionStore.loadTransactions();
        this.savePreferences();
        if (addAnother) {
          this.resetForNextEntry();
          return;
        }
        this.ignorePreventUnsavedChanges = true
        this.router.navigate(['/transactions']);
      },
      error: (error) => {
        this.errorMessage.set(
          error.error?.message || this.translate.instant('upsertTransaction.transactionCreatedError')
        );
        this.isSubmitting.set(false);
      }
    });
  }

  // Mantiene persona, fecha y modo; limpia el resto para cargar la siguiente fila
  private resetForNextEntry(): void {
    this.formGroup.patchValue({
      totalAmount: null,
      description: null,
      hasReimbursement: false,
    });
    this.formGroup.controls.reimbursement.reset();
    this.formGroup.markAsPristine();
    this.formGroup.markAsUntouched();
    this.isSubmitting.set(false);
    document.getElementById('totalAmount')?.focus();
  }

  // ========== Navigation ==========
  protected goBack(): void {
    this.location.back();
  }

  // ========== Formatters ==========
  protected formatCurrency = (amount: number): string => this.formatterService.formatCurrency(amount, 4)

  private getMaxValue(): number {
    const splitType = this.formGroup.value.splitType;
    return splitType === this.splitType.Percentage ? 100 : this.calculateNetAmount();
  }
}