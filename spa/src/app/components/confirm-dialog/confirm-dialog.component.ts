import { Component, ElementRef, output, signal, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { TextAreaInputComponent } from '../inputs/text-area-input/text-area-input.component';

export type ConfirmDialogType = 'warning' | 'error' | 'info' | 'success' | 'default';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: ConfirmDialogType;
  /** Si se pasa, muestra un textarea con este label */
  inputLabel?: string;
  inputPlaceholder?: string;
  inputRequired?: boolean;
}

export interface ConfirmDialogResult {
  confirmed: boolean;
  value?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.css'],
  imports: [TranslateModule, ReactiveFormsModule, TextAreaInputComponent]
})
export class ConfirmDialogComponent {
  @ViewChild('confirmDialog', { static: true }) confirmDialog!: ElementRef<HTMLDialogElement>;

  protected dialogData = signal<ConfirmDialogData | null>(null);
  protected formGroup!: FormGroup;

  confirmed = output<ConfirmDialogResult>();

  public open(data: ConfirmDialogData): void {
    this.dialogData.set(data);
    const validators = data.inputRequired ? [Validators.required] : [];
    this.formGroup = new FormGroup({
      value: new FormControl('', validators)
    });
    this.confirmDialog.nativeElement.showModal();
  }

  public close(): void {
    this.confirmDialog.nativeElement.close();
    this.dialogData.set(null);
  }

  protected onConfirm(): void {
    const data = this.dialogData();
    if (data?.inputLabel !== undefined) {
      if (this.formGroup.invalid) {
        this.formGroup.markAllAsTouched();
        return;
      }
    }
    this.confirmed.emit({ confirmed: true, value: this.formGroup?.value?.value || undefined });
    this.close();
  }

  protected onCancel(): void {
    this.confirmed.emit({ confirmed: false });
    this.close();
  }

  protected get confirmBtnClass(): string {
    const type = this.dialogData()?.type ?? 'default';
    const classes: Record<ConfirmDialogType, string> = {
      warning: 'btn btn-warning',
      error: 'btn btn-error',
      info: 'btn btn-info',
      success: 'btn btn-success',
      default: 'btn btn-primary',
    };
    return classes[type];
  }
}
