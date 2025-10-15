import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import Swal from 'sweetalert2';
import { useCollaboratorStore, useTransactionStore } from '../../store';
import { SplitType, WhoPaid } from '../../models/enums';
import { CreateTransactionApiRequest, ReimbursementApiRequest, TransactionSplitApiRequest } from '../../models/api/transactions';
import { ParticipantType } from '../../enums';

@Component({
  selector: 'app-upsert-transaction',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-transaction.component.html',
  styleUrls: ['./upsert-transaction.component.css']
})
export class TransactionFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly transactionStore = useTransactionStore();
  private readonly collaboratorStore = useCollaboratorStore();

  // Signals
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  customUserAmount = signal<number>(0);
  customCollaboratorAmount = signal<number>(0);

  // Form
  form!: FormGroup;
  isEditMode = false;
  transactionId?: number;

  // Computed
  linkedCollaborators = computed(() => this.collaboratorStore.linkedCollaborators());
  protected splitType = SplitType
  protected whoPaid = WhoPaid

  ngOnInit(): void {
    this.initForm();
    this.checkEditMode();
    this.loadCollaborators();
  }

  private initForm(): void {
    this.form = this.fb.group({
      collaboratorId: [null, Validators.required],
      totalAmount: [null, [Validators.required, Validators.min(0.01)]],
      description: [null],
      splitType: [SplitType.Equal, Validators.required],
      whoPaid: [WhoPaid.User, Validators.required],
      hasReimbursement: [false],
      reimbursement: this.fb.group({
        amount: [null],
        description: [null]
      })
    });

    // Watch for changes in totalAmount to recalculate splits
    this.form.get('totalAmount')?.valueChanges.subscribe(() => {
      this.recalculateSplits();
    });

    this.form.get('splitType')?.valueChanges.subscribe(() => {
      this.recalculateSplits();
    });
  }

  private checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.transactionId = parseInt(id);
      // Load transaction data
      // this.loadTransaction(this.transactionId);
    }
  }

  private loadCollaborators(): void {
    if (this.collaboratorStore.totalCount() === 0) {
      this.collaboratorStore.loadCollaborators();
    }
  }

  // ========== Split Type Handlers ==========
  setSplitType(type: SplitType): void {
    this.form.patchValue({ splitType: type });
    this.recalculateSplits();
  }

  setWhoPaid(who: WhoPaid): void {
    this.form.patchValue({ whoPaid: who });
  }

  private recalculateSplits(): void {
    const totalAmount = this.form.get('totalAmount')?.value || 0;
    const splitType = this.form.get('splitType')?.value;
    const netAmount = this.calculateNetAmount();

    if (splitType === SplitType.Equal) {
      const half = netAmount / 2;
      this.customUserAmount.set(half);
      this.customCollaboratorAmount.set(half);
    } else if (splitType === SplitType.Custom) {
      // Keep current values or reset
      if (this.customUserAmount() === 0 && this.customCollaboratorAmount() === 0) {
        const half = netAmount / 2;
        this.customUserAmount.set(half);
        this.customCollaboratorAmount.set(half);
      }
    } else if (splitType === SplitType.Percentage) {
      // Keep percentages or default to 50/50
      if (this.customUserAmount() === 0 && this.customCollaboratorAmount() === 0) {
        this.customUserAmount.set(50);
        this.customCollaboratorAmount.set(50);
      }
    }
  }

  onCustomUserAmountChange(event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value) || 0;
    this.customUserAmount.set(value);

    const splitType = this.form.get('splitType')?.value;
    const netAmount = this.calculateNetAmount();

    if (splitType === SplitType.Custom) {
      this.customCollaboratorAmount.set(netAmount - value);
    } else if (splitType === SplitType.Percentage) {
      this.customCollaboratorAmount.set(100 - value);
    }
  }

  onCustomCollaboratorAmountChange(event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value) || 0;
    this.customCollaboratorAmount.set(value);

    const splitType = this.form.get('splitType')?.value;
    const netAmount = this.calculateNetAmount();

    if (splitType === SplitType.Custom) {
      this.customUserAmount.set(netAmount - value);
    } else if (splitType === SplitType.Percentage) {
      this.customUserAmount.set(100 - value);
    }
  }

  // ========== Calculations ==========
  calculateNetAmount(): number {
    const totalAmount = this.form.get('totalAmount')?.value || 0;
    const hasReimbursement = this.form.get('hasReimbursement')?.value;
    const reimbursementAmount = hasReimbursement ? (this.form.get('reimbursement.amount')?.value || 0) : 0;
    return totalAmount - reimbursementAmount;
  }

  calculateMySplit(): number {
    const netAmount = this.calculateNetAmount();
    const splitType = this.form.get('splitType')?.value;

    if (splitType === SplitType.Equal) {
      return netAmount / 2;
    } else if (splitType === SplitType.Custom) {
      return this.customUserAmount();
    } else if (splitType === SplitType.Percentage) {
      return (netAmount * this.customUserAmount()) / 100;
    }
    return 0;
  }

  calculateTheirSplit(): number {
    const netAmount = this.calculateNetAmount();
    const splitType = this.form.get('splitType')?.value;

    if (splitType === SplitType.Equal) {
      return netAmount / 2;
    } else if (splitType === SplitType.Custom) {
      return this.customCollaboratorAmount();
    } else if (splitType === SplitType.Percentage) {
      return (netAmount * this.customCollaboratorAmount()) / 100;
    }
    return 0;
  }

  // ========== Reimbursement ==========
  onReimbursementToggle(): void {
    const hasReimbursement = this.form.get('hasReimbursement')?.value;
    const reimbursementGroup = this.form.get('reimbursement') as FormGroup;

    if (hasReimbursement) {
      reimbursementGroup.get('amount')?.setValidators([
        Validators.required,
        Validators.min(0.01),
        Validators.max(this.form.get('totalAmount')?.value || 0)
      ]);
    } else {
      reimbursementGroup.get('amount')?.clearValidators();
      reimbursementGroup.reset();
    }

    reimbursementGroup.get('amount')?.updateValueAndValidity();
    this.recalculateSplits();
  }

  // ========== Submit ==========
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
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

    const formValue = this.form.value;
    const whoPaid = formValue.whoPaid;

    // Create splits
    const splits: TransactionSplitApiRequest[] = [
      new TransactionSplitApiRequest(
        ParticipantType.User,
        mySplit,
        this.form.get('splitType')?.value === SplitType.Percentage ? this.customUserAmount() : null
      ),
      new TransactionSplitApiRequest(
        ParticipantType.Collaborator,
        theirSplit,
        this.form.get('splitType')?.value === SplitType.Percentage ? this.customCollaboratorAmount() : null
      )
    ];

    // Create reimbursement if needed
    let reimbursement: ReimbursementApiRequest | null = null;
    if (formValue.hasReimbursement && formValue.reimbursement.amount > 0) {
      reimbursement = new ReimbursementApiRequest(
        formValue.reimbursement.amount,
        formValue.reimbursement.description
      );
    }

    // Create request
    const request = new CreateTransactionApiRequest(
      formValue.collaboratorId,
      formValue.totalAmount,
      formValue.description,
      formValue.splitType,
      whoPaid,
      splits,
      reimbursement
    );

    // Submit
    this.transactionStore.createTransaction(request).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Transaction created successfully',
          timer: 2000,
          showConfirmButton: false
        });
        // Reload transactions
        this.transactionStore.loadTransactions();
        this.router.navigate(['/transactions']);
      },
      error: (error) => {
        console.error('Error creating transaction:', error);
        this.errorMessage.set(error.error?.message || 'Failed to create transaction');
        this.isSubmitting.set(false);
      }
    });
  }

  // ========== Navigation ==========
  goBack(): void {
    this.location.back();
  }

  // ========== Formatters ==========
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0
    }).format(amount);
  }
}