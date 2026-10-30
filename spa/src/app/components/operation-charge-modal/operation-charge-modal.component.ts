import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, EventEmitter, Output, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { useCurrencyStore, useTravelStore } from '../../store';
import { AlertService, FormatterHelperService } from '../../services';
import { Configurations } from '../../models/enums';
import { RegisterOperationChargeApiRequest, TravelOperationApiModel } from '../../models/api/travels';
import { TextComponent } from '../inputs/text/text.component';
import { SelectInputComponent } from '../inputs/select-input/select-input.component';

interface OperationChargeFormGroup {
  chargedAmount: FormControl<number | null>;
  chargedCurrencyId: FormControl<number | null>;
}

// Guaraní: moneda local por defecto del cobro
const GUARANI_CURRENCY_ID = 4;

// Registrar lo que el banco cobró en la moneda local por un gasto con tarjeta en otra moneda
// (ej. R$ 300 → Gs. 412.000). Es informativo: no cambia la división de la operación.
@Component({
  selector: 'app-operation-charge-modal',
  templateUrl: './operation-charge-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, TextComponent, SelectInputComponent],
})
export class OperationChargeModalComponent {
  private destroyRef = inject(DestroyRef);
  private alertService = inject(AlertService);
  private translate = inject(TranslateService);
  private formatterService = inject(FormatterHelperService);
  private travelStore = useTravelStore();
  private currencyStore = useCurrencyStore();

  @Output() completed = new EventEmitter<TravelOperationApiModel>();

  protected visible = signal(false);
  protected isSubmitting = signal(false);
  protected operation = signal<TravelOperationApiModel | null>(null);
  protected form = new FormGroup<OperationChargeFormGroup>({
    chargedAmount: new FormControl(null, [Validators.required, Validators.min(1)]),
    chargedCurrencyId: new FormControl(null, [Validators.required]),
  });
  private formValue = toSignal(this.form.valueChanges, { initialValue: this.form.value });

  protected formatCurrency = this.formatterService.formatCurrency;

  // Todas las monedas menos la de la operación (el cobro es en otra moneda)
  protected currencyList = computed(() => {
    const operationCurrencyId = this.operation()?.currencyId;
    const currencies = this.currencyStore.getAllCurrencies().filter(x => x.id !== operationCurrencyId);
    return this.formatterService.convertToList(currencies, Configurations.Currencies);
  });

  // Cotización real: lo cobrado por cada unidad de la moneda de la operación
  protected exchangeRate = computed(() => {
    const operation = this.operation();
    const { chargedAmount, chargedCurrencyId } = this.formValue();
    if (!operation || !chargedAmount || !chargedCurrencyId || +chargedAmount <= 0) return null;
    return {
      unit: `1 ${operation.currencySymbol ?? ''}`.trim(),
      value: this.formatCurrency(+chargedAmount / operation.amount, +chargedCurrencyId),
    };
  });

  public open(operation: TravelOperationApiModel): void {
    this.currencyStore.loadCurrencies();
    this.operation.set(operation);
    const defaultCurrencyId = operation.currencyId !== GUARANI_CURRENCY_ID ? GUARANI_CURRENCY_ID : null;
    this.form.reset({
      chargedAmount: operation.chargedAmount ?? null,
      chargedCurrencyId: operation.chargedCurrencyId ?? defaultCurrencyId,
    });
    this.visible.set(true);
  }

  protected close(): void {
    this.visible.set(false);
    this.operation.set(null);
  }

  protected submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const values = this.form.getRawValue();
    // Los inputs de app-text devuelven string: convertir antes de enviar
    this.save(new RegisterOperationChargeApiRequest(+values.chargedAmount!, +values.chargedCurrencyId!), 'operations.chargeRegisteredSuccess');
  }

  protected removeCharge(): void {
    this.save(new RegisterOperationChargeApiRequest(null, null), 'operations.chargeRemovedSuccess');
  }

  private save(request: RegisterOperationChargeApiRequest, successKey: string): void {
    const operation = this.operation();
    if (!operation) return;
    this.isSubmitting.set(true);
    this.travelStore.registerOperationCharge(operation.id, request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => {
        this.isSubmitting.set(false);
        this.alertService.showSuccess(this.translate.instant(successKey));
        this.close();
        this.completed.emit(updated);
      },
      // El interceptor global ya muestra el motivo que manda el backend (clave i18n)
      error: () => this.isSubmitting.set(false),
    });
  }
}
