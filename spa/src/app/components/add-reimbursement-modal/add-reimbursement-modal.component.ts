import { Component, ElementRef, inject, OnDestroy, output, signal, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReimbursementFormGroup } from '../../models/forms';
import { AlertService, HelperService } from '../../services';
import { TextAreaInputComponent } from '../inputs/text-area-input/text-area-input.component';
import { TextComponent } from '../inputs/text/text.component';
import { useTransactionStore } from '../../store';

@Component({
  selector: 'app-add-reimbursement-modal',
  templateUrl: './add-reimbursement-modal.component.html',
  styleUrls: ['./add-reimbursement-modal.component.css'],
  imports: [
    ReactiveFormsModule,
    TextComponent,
    TextAreaInputComponent,
  ]
})
export class AddReimbursementModalComponent implements OnDestroy {
  @ViewChild('reimbursementModal', { static: true }) reimbursementModal!: ElementRef<HTMLDialogElement>
  protected maxAmount: number = 0
  private transactionId: number = 0

  public loadData = output<boolean>();

  private readonly transactionStore = useTransactionStore();
  private alertService = inject(AlertService);
  protected formGroup: FormGroup<ReimbursementFormGroup>
  protected formatCurrency = HelperService.formatCurrency
  isSubmitting = signal<boolean>(false);

  constructor() {
    this.formGroup = new FormGroup<ReimbursementFormGroup>({
      amount: new FormControl(null, [Validators.required, Validators.min(0), Validators.max(this.maxAmount)]),
      description: new FormControl(null, [Validators.required, Validators.maxLength(100)])
    })
  }

  ngOnDestroy(): void {
    this.closeDialog()
  }

  protected onSubmit(): void {
    if (this.formGroup.invalid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.transactionStore.addReimbursement(this.transactionId, {
      amount: +this.formGroup.value.amount!,
      description: this.formGroup.value.description
    }).subscribe({
      next: () => {
        this.alertService.showSuccess('Reimbursement added successfully')
        this.loadData.emit(true)
        this.closeDialog();
      },
      error: (error) => {
        console.error('Error adding reimbursement:', error);
        this.alertService.showError('Failed to add reimbursement')
        this.isSubmitting.set(false);
      }
    });
  }

  public openDialog = (maxAmount: number, transactionId: number): void => {
    this.transactionId = transactionId
    this.maxAmount = maxAmount
    this.formGroup = new FormGroup<ReimbursementFormGroup>({
      amount: new FormControl(null, [Validators.required, Validators.min(0), Validators.max(maxAmount)]),
      description: new FormControl(null, [Validators.required, Validators.maxLength(100)])
    })
    this.formGroup.updateValueAndValidity()
    this.reimbursementModal.nativeElement.showModal()
  }

  protected closeDialog = (): void => {
    this.formGroup.reset()
    this.reimbursementModal.nativeElement.remove()
  }
}
