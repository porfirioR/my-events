import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, Input, OnInit, Self, computed, inject, signal } from '@angular/core';
import { ControlValueAccessor, FormControl, FormGroup, NgControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormErrorsComponent } from '../form-errors/form-errors.component';
import { TextComponent } from '../inputs/text/text.component';
import { SelectInputComponent } from '../inputs/select-input/select-input.component';
import { AlertService } from '../../services';
import { useFinancialInstitutionsStore } from '../../store';
import { CreateFinancialInstitutionApiRequest, FinancialInstitutionApiModel } from '../../models/api/financial-institutions';
import { FinancialInstitutionType, FinancialInstitutionTypeLabels } from '../../models/enums';
import { KeyValueViewModel } from '../../models/view/key-value-view-model';

interface FinancialInstitutionFormGroup {
  name: FormControl<string | null>;
  type: FormControl<number | null>;
}

/**
 * Selector de entidad financiera (bancos, cooperativas, efectivo, personas).
 * Muestra las entidades del sistema + las propias del usuario agrupadas por tipo,
 * y permite crear una entidad nueva sin salir del formulario.
 */
@Component({
  selector: 'app-institution-selector',
  templateUrl: './institution-selector.component.html',
  styleUrls: ['./institution-selector.component.css'],
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, FormErrorsComponent, TextComponent, SelectInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstitutionSelectorComponent implements ControlValueAccessor, OnInit {
  @Input({ required: true }) id: string = '';
  @Input({ required: true }) label: string = '';
  @Input({ required: true }) name: string = '';
  @Input() description?: string | null;
  @Input() allowCreate = true;

  private destroyRef = inject(DestroyRef);
  private translate = inject(TranslateService);
  private alertService = inject(AlertService);
  protected financialInstitutionsStore = useFinancialInstitutionsStore();

  protected FinancialInstitutionTypeLabels = FinancialInstitutionTypeLabels;
  private types = Object.values(FinancialInstitutionType).filter((v): v is FinancialInstitutionType => typeof v === 'number');

  // stream: se actualiza cuando terminan de cargar las traducciones o cambia el idioma
  private typeTranslations = toSignal(
    this.translate.stream(this.types.map(type => FinancialInstitutionTypeLabels[type])),
    { initialValue: {} as Record<string, string> }
  );
  protected typeList = computed(() => {
    const translations = this.typeTranslations();
    return this.types.map(type =>
      new KeyValueViewModel(type, translations[FinancialInstitutionTypeLabels[type]] ?? FinancialInstitutionTypeLabels[type], '')
    );
  });

  protected showCreate = signal(false);
  protected creating = signal(false);

  public formGroup = new FormGroup<FinancialInstitutionFormGroup>({
    name: new FormControl('', [Validators.required, Validators.maxLength(50)]),
    type: new FormControl(FinancialInstitutionType.Bank, [Validators.required]),
  });

  constructor(@Self() public ngControl: NgControl) {
    this.ngControl.valueAccessor = this;
  }

  ngOnInit(): void {
    this.financialInstitutionsStore.loadFinancialInstitutions();
  }

  writeValue(obj: any): void { }

  registerOnChange(fn: any): void { }

  registerOnTouched(fn: any): void { }

  setDisabledState?(isDisabled: boolean): void { }

  protected getFinancialInstitutionLabel = (financialInstitution: FinancialInstitutionApiModel): string =>
    financialInstitution.isOther ? this.translate.instant('loans.entityOtros') : financialInstitution.name;

  protected toggleCreate = (): void => {
    this.showCreate.update(v => !v);
    this.formGroup.reset({ name: '', type: FinancialInstitutionType.Bank });
  };

  protected onCreateKeydown = (event: Event): void => {
    // Evita que el Enter dispare el submit del formulario padre
    event.preventDefault();
    event.stopPropagation();
    this.save();
  };

  protected save = (): void => {
    if (this.formGroup.invalid || this.creating()) {
      this.formGroup.markAllAsTouched();
      return;
    }

    this.creating.set(true);
    const values = this.formGroup.getRawValue();
    this.formGroup.disable({ emitEvent: false });
    const request = new CreateFinancialInstitutionApiRequest(values.name!.trim(), values.type!);

    this.financialInstitutionsStore.createFinancialInstitution(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: financialInstitution => {
        this.ngControl.control?.setValue(financialInstitution.id);
        this.ngControl.control?.markAsDirty();
        this.formGroup.enable({ emitEvent: false });
        this.creating.set(false);
        this.showCreate.set(false);
        this.alertService.showSuccess(this.translate.instant('financialInstitutions.createdSuccess'));
      },
      error: (error: HttpErrorResponse) => {
        this.formGroup.enable({ emitEvent: false });
        this.creating.set(false);
        const key = error.status === HttpStatusCode.Conflict
          ? 'financialInstitutions.alreadyExists'
          : 'financialInstitutions.createdError';
        this.alertService.showError(this.translate.instant(key));
      },
    });
  };
}
