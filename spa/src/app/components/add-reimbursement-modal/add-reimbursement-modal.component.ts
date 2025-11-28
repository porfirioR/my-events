import { Component, effect, ElementRef, inject, output, signal, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReimbursementFormGroup } from '../../models/forms';
import { AlertService, FormatterHelperService } from '../../services';
import { TextAreaInputComponent } from '../inputs/text-area-input/text-area-input.component';
import { TextComponent } from '../inputs/text/text.component';
import { useTransactionStore } from '../../store';
import { AddReimbursementApiRequest } from '../../models/api';

export interface ReimbursementModalData {
  maxAmount: number;
  transactionId: number;
}

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
export class AddReimbursementModalComponent {
  @ViewChild('reimbursementModal', { static: true }) reimbursementModal!: ElementRef<HTMLDialogElement>
  private formatterService = inject(FormatterHelperService);

  // Signals para manejar el estado
  private isOpen = signal<boolean>(false);
  protected modalData = signal<ReimbursementModalData | null>(null);
  protected isSubmitting = signal<boolean>(false);
  private submitTimestamp = signal<number>(0);
  
  // Output cuando se cierra con éxito
  closed = output<boolean>();

  private readonly transactionStore = useTransactionStore();
  private readonly alertService = inject(AlertService);
  protected formGroup!: FormGroup<ReimbursementFormGroup>;
  protected formatCurrency = this.formatterService.formatCurrency;

  constructor() {
    this.formGroup = new FormGroup<ReimbursementFormGroup>({
      amount: new FormControl(null, [Validators.required, Validators.min(0), Validators.max(this.modalData()?.maxAmount || 0)]),
      description: new FormControl(null, [Validators.required, Validators.maxLength(100)])
    })
    // Effect para detectar éxito
    effect(() => {
      this.transactionStore.transactions();
      const timestamp = this.submitTimestamp();
      
      if (timestamp > 0 && (Date.now() - timestamp) > 100) {
        this.handleSuccess();
      }
    });

    // Effect para detectar errores
    effect(() => {
      const error = this.transactionStore.error();
      const timestamp = this.submitTimestamp();

      if (error && timestamp > 0) {
        this.handleError();
      }
    });

    // Effect para sincronizar el estado del modal con el DOM
    effect(() => {
      const open = this.isOpen();
      const dialog = this.reimbursementModal?.nativeElement;
      
      if (!dialog) return;

      if (open && !dialog.open) {
        const data = this.modalData();
        if (data) {
          this.initializeForm(data.maxAmount);
          dialog.showModal();
        }
      } else if (!open && dialog.open) {
        dialog.close();
        this.formGroup?.reset();
      }
    });
  }

  public open(data: ReimbursementModalData): void {
    this.modalData.set(data);
    this.isOpen.set(true);
  }

  public close(): void {
    this.isOpen.set(false);
    this.isSubmitting.set(false);
    this.submitTimestamp.set(0);
  }

  protected onSubmit(): void {
    if (this.formGroup.invalid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const data = this.modalData();
    if (!data) return;

    this.isSubmitting.set(true);
    this.submitTimestamp.set(Date.now());

    const request = new AddReimbursementApiRequest(
      +this.formGroup.value.amount!, 
      this.formGroup.value.description
    );

    this.transactionStore.addReimbursement({
      transactionId: data.transactionId, 
      request
    });
  }

  private initializeForm(maxAmount: number): void {
    this.formGroup = new FormGroup<ReimbursementFormGroup>({
      amount: new FormControl(null, [Validators.required, Validators.min(0), Validators.max(maxAmount)]),
      description: new FormControl(null, [Validators.required, Validators.maxLength(100)])
    });
  }

  private handleSuccess(): void {
    this.isSubmitting.set(false);
    this.submitTimestamp.set(0);
    this.alertService.showSuccess('Reimbursement added successfully');
    this.closed.emit(true);
    this.close();
  }

  private handleError(): void {
    this.alertService.showError('Failed to add reimbursement');
    this.isSubmitting.set(false);
    this.submitTimestamp.set(0);
  }
}