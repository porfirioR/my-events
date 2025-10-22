import { Component, OnInit, signal, computed, inject, Signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Location } from '@angular/common';
import { useCollaboratorStore, useLoadingStore, useTransactionStore } from '../../store';
import { Configurations, ParticipantType, SplitType, WhoPaid } from '../../models/enums';
import { CreateTransactionApiRequest, ReimbursementApiRequest, TransactionApiModel, TransactionSplitApiRequest, TransactionViewApiModel } from '../../models/api/transactions';
import { ReimbursementFormGroup, TransactionFormGroup, TransactionSplitFormGroup } from '../../models/forms';
import { AlertService, HelperService } from '../../services';
import { SelectInputComponent } from '../inputs/select-input/select-input.component';
import { KeyValueViewModel } from '../../models/view';
import { TextComponent } from '../inputs/text/text.component';
import { TextAreaInputComponent } from '../inputs/text-area-input/text-area-input.component';
import { CheckBoxInputComponent } from '../inputs/check-box-input/check-box-input.component';
import { debounceTime, tap } from 'rxjs';

@Component({
  selector: 'app-upsert-transaction',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    SelectInputComponent,
    TextComponent,
    TextAreaInputComponent,
    CheckBoxInputComponent
  ],
  templateUrl: './upsert-transaction.component.html',
  styleUrls: ['./upsert-transaction.component.css']
})
export class UpsertTransactionComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly alertService = inject(AlertService);
  private readonly transactionStore = useTransactionStore();
  private readonly collaboratorStore = useCollaboratorStore();
  private loadingStore = useLoadingStore();
  protected isLoading = this.loadingStore.isLoading;
  protected selectedTransaction = this.transactionStore.selectedTransaction;
  private transaction: TransactionApiModel | undefined;

  // Signals
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  customUserAmount = signal<number>(0);
  customCollaboratorAmount = signal<number>(0);

  // Form
  protected formGroup: FormGroup<TransactionFormGroup>
  isEditMode = false;
  transactionId?: number;

  // Computed
  protected linkedCollaborators: Signal<KeyValueViewModel[]> = computed(() => {
    const linkedCollaborators = this.collaboratorStore.linkedCollaborators()
    return HelperService.convertToList(linkedCollaborators, Configurations.Collaborator)
  });
  protected splitType = SplitType
  protected whoPaid = WhoPaid

  constructor() {
    const reimbursement = new FormGroup<ReimbursementFormGroup>({
      amount: new FormControl(null),
      description: new FormControl(null)
    })
    this.formGroup = new FormGroup<TransactionFormGroup>({
      collaboratorId: new FormControl(null, [Validators.required]),
      totalAmount: new FormControl(null, [Validators.required, Validators.min(0)]),
      description: new FormControl(null, [Validators.required]),
      splitType: new FormControl(SplitType.Equal, [Validators.required]),
      whoPaid: new FormControl(WhoPaid.User, [Validators.required]),
      splits: new FormArray<FormGroup<TransactionSplitFormGroup>>([]),
      hasReimbursement: new FormControl(false),
      reimbursement: reimbursement
    });

    // Watch for changes in totalAmount to recalculate splits
    this.formGroup.controls.totalAmount.valueChanges.pipe(
      tap(()=> {
        this.customUserAmount.set(0);
        this.customCollaboratorAmount.set(0);
        this.formGroup.controls.reimbursement.controls.amount.reset();
        this.formGroup.controls.reimbursement.controls.amount.clearValidators();
      }),
      debounceTime(100)
    ).subscribe((totalAmount) => {
      this.recalculateSplits(this.formGroup.value.splitType!);
      if (totalAmount) {
        this.formGroup.controls.reimbursement.controls.amount.addValidators([Validators.max(totalAmount)])
      }
      this.formGroup.controls.reimbursement.updateValueAndValidity()
    });
    this.formGroup.controls.splitType.valueChanges.subscribe(splitType => {
      this.recalculateSplits(splitType!);
    });
    this.formGroup.controls.hasReimbursement.valueChanges.subscribe(x => this.onReimbursementToggle(x));

    effect(() => {
      this.transaction = this.selectedTransaction();
      if (this.transaction && this.isEditMode) {
        this.formGroup.patchValue({
          collaboratorId: this.transaction.collaboratorId,
          totalAmount: this.transaction.totalAmount,
          description: this.transaction.description,
          splitType: this.transaction.splitType,
          whoPaid: this.transaction.whoPaid,
          // splits: this.transaction.splits,
          hasReimbursement: !!this.transaction.totalReimbursement,
          // reimbursement: this.transaction.reimbursement
        });
      }
    });
  }

  ngOnInit(): void {
    this.checkEditMode();
    this.loadCollaborators();
  }

  private checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.transactionId = parseInt(id);
      // Load transaction data
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
  protected onSubmit(): void {
    if (this.formGroup.invalid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    // Validate splits
    const mySplit = this.calculateMySplit();
    const theirSplit = this.calculateTheirSplit();
    const netAmount = this.calculateNetAmount();

    if (Math.abs((mySplit + theirSplit) - netAmount) > 0.01) {
      this.errorMessage.set('Splits do not add up to the net amount');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const formValue = this.formGroup.value;
    const whoPaid = formValue.whoPaid;

    // Create splits
    const splits: TransactionSplitApiRequest[] = [
      new TransactionSplitApiRequest(
        ParticipantType.User,
        mySplit,
        this.formGroup.value.splitType === this.splitType.Percentage ? this.customUserAmount() : null
      ),
      new TransactionSplitApiRequest(
        ParticipantType.Collaborator,
        theirSplit,
        this.formGroup.value.splitType === this.splitType.Percentage ? this.customCollaboratorAmount() : null
      )
    ];

    // Create reimbursement if needed
    let reimbursement: ReimbursementApiRequest | null = null;
    if (formValue.hasReimbursement && formValue.reimbursement?.amount! > 0) {
      reimbursement = new ReimbursementApiRequest(
        +formValue.reimbursement?.amount!,
        formValue.reimbursement?.description
      );
    }

    // Create request
    const request = new CreateTransactionApiRequest(
      formValue.collaboratorId!,
      +formValue.totalAmount!,
      formValue.description!,
      formValue.splitType!,
      whoPaid!,
      splits,
      reimbursement
    );

    // Submit
    this.transactionStore.createTransaction(request).subscribe({
      next: () => {
        this.alertService.showSuccess('Transaction created successfully')
        // Reload transactions
        this.transactionStore.loadTransactions();
        this.router.navigate(['/transactions']);
      },
      error: (error) => {
        this.errorMessage.set(error.error?.message || 'Failed to create transaction');
        this.isSubmitting.set(false);
      }
    });
  }

  // ========== Navigation ==========
  protected goBack(): void {
    this.location.back();
  }

  // ========== Formatters ==========
  protected formatCurrency = (amount: number): string => HelperService.formatCurrency(amount)

  private getMaxValue(): number {
    const splitType = this.formGroup.value.splitType;
    return splitType === this.splitType.Percentage ? 100 : this.calculateNetAmount();
  }
}