import { CommonModule, Location } from '@angular/common';
import { Component, OnInit, Signal, computed, effect, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { OperationFormGroup } from '../../models/forms/operation-form-group';
import { useTravelStore, useLoadingStore, useCurrencyStore } from '../../store';
import { AlertService, FormatterHelperService } from '../../services';
import { CreateTravelOperationApiRequest, UpdateTravelOperationApiRequest } from '../../models/api/travels';
import { SelectInputComponent } from '../inputs/select-input/select-input.component';
import { TextAreaInputComponent } from '../inputs/text-area-input/text-area-input.component';
import { TextComponent } from '../inputs/text/text.component';
import { DateInputComponent } from '../inputs/date-input/date-input.component';
import { KeyValueViewModel } from '../../models/view';
import { Configurations, SplitType } from '../../models/enums';

@Component({
  selector: 'app-upsert-operation',
  templateUrl: './upsert-operation.component.html',
  styleUrls: ['./upsert-operation.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    SelectInputComponent,
    TextComponent,
    TextAreaInputComponent,
    DateInputComponent
  ]
})
export class UpsertOperationComponent implements OnInit {
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private alertService = inject(AlertService);
  private formatterService = inject(FormatterHelperService);
  private translate = inject(TranslateService);
  private readonly location = inject(Location);

  private travelStore = useTravelStore();
  private currencyStore = useCurrencyStore();
  private loadingStore = useLoadingStore();

  protected isLoading = this.loadingStore.isLoading;
  protected travel = this.travelStore.selectedTravel;
  protected members = this.travelStore.members;
  protected paymentMethods = this.travelStore.paymentMethods;

  protected travelId?: number;
  protected operationId?: number;
  protected isEditMode = signal(false);

  // Lista de monedas
  protected currencyList: Signal<KeyValueViewModel[]>  = computed(() => {
    return this.formatterService.convertToList(this.currencyStore.currencies(), Configurations.Currencies);
  });

  protected isSubmitting = signal<boolean>(false);

  // Lista de miembros para dropdown
  protected memberList = computed(() => {
    return this.members().map(x => new KeyValueViewModel(
      x.id,
      `${x.collaboratorName} ${x.collaboratorSurname}`,
      ''
    ))
  });

  // Lista de métodos de pago
  protected paymentMethodList: Signal<KeyValueViewModel[]> = computed(() => {
    return this.formatterService.convertToList(this.paymentMethods(), Configurations.PaymentMethod);
  });

  // Tipos de split
  protected splitTypeList: KeyValueViewModel[] = [
    new KeyValueViewModel(SplitType.Equal, this.translate.instant('operations.equal'), ''),
    new KeyValueViewModel(SplitType.Custom, this.translate.instant('operations.custom'), ''),
    new KeyValueViewModel(SplitType.Percentage, this.translate.instant('operations.percentage'), '')
  ];

  // Participantes seleccionados
  protected selectedParticipants = signal<number[]>([]);

  public ignorePreventUnsavedChanges = false;
  public formGroup: FormGroup<OperationFormGroup>;

  constructor() {
    this.formGroup = new FormGroup<OperationFormGroup>({
      id: new FormControl(null),
      currencyId: new FormControl(null, [Validators.required]),
      paymentMethodId: new FormControl(null, [Validators.required]),
      whoPaidMemberId: new FormControl(null, [Validators.required]),
      amount: new FormControl(null, [Validators.required, Validators.min(0.01)]),
      description: new FormControl('', [Validators.required, Validators.maxLength(500)]),
      splitType: new FormControl(SplitType.Equal, [Validators.required]),
      transactionDate: new FormControl(this.getTodayDate(), [Validators.required]),
      participantMemberIds: new FormControl<number[]>([], [Validators.required])
    });

    // Effect para cargar la operación en modo edición
    effect(() => {
      if (this.isEditMode() && this.operationId && this.travelId) {
        this.travelStore.loadOperations(this.travelId);
        const operation = this.travelStore.operations().find(op => op.id === this.operationId);

        if (operation) {
          this.formGroup.patchValue({
            id: operation.id,
            currencyId: operation.currencyId,
            paymentMethodId: operation.paymentMethodId,
            whoPaidMemberId: operation.whoPaidMemberId,
            amount: operation.amount,
            description: operation.description,
            splitType: operation.splitType,
            transactionDate: this.formatDateForInput(operation.transactionDate)
          });

          // TODO: Cargar participantMemberIds desde el backend si está disponible
          this.selectedParticipants.set([]);
        }
      }
    });
  }

  ngOnInit(): void {
    const travelId = this.activatedRoute.snapshot.params['travelId'];
    const operationId = this.activatedRoute.snapshot.params['operationId'];

    if (travelId) {
      this.travelId = +travelId;
      this.travelStore.loadTravelById(this.travelId);
      this.travelStore.loadMembers(this.travelId);
      this.travelStore.loadPaymentMethods();
      this.currencyStore.loadCurrencies();

      // Si hay travel cargado, establecer su moneda por defecto
      if (this.travel()) {
        this.formGroup.patchValue({
          currencyId: this.travel()!.defaultCurrencyId
        });
      }
    }

    if (operationId) {
      this.operationId = +operationId;
      this.isEditMode.set(true);
    }
  }

  protected toggleParticipant(memberId: number): void {
    const current = this.selectedParticipants();
    if (current.includes(memberId)) {
      this.selectedParticipants.set(current.filter(id => id !== memberId));
    } else {
      this.selectedParticipants.set([...current, memberId]);
    }
    this.formGroup.patchValue({
      participantMemberIds: this.selectedParticipants()
    });
  }

  protected isParticipantSelected(memberId: number): boolean {
    return this.selectedParticipants().includes(memberId);
  }

  protected async save(): Promise<void> {
    if (this.formGroup.invalid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    if (!this.travelId) return;

    const formValue = this.formGroup.value;
    this.isSubmitting.set(true);

    if (this.isEditMode() && this.operationId) {
      // Editar operación existente
      const request = new UpdateTravelOperationApiRequest(
        formValue.currencyId!,
        formValue.paymentMethodId!,
        formValue.whoPaidMemberId!,
        formValue.amount!,
        formValue.description!,
        formValue.splitType!,
        new Date(formValue.transactionDate!),
        formValue.participantMemberIds!
      );

      this.formGroup.disable();
      this.travelStore.updateOperation(this.travelId, this.operationId, request).subscribe({
        next: () => {
          this.ignorePreventUnsavedChanges = true;
          this.alertService.showSuccess(
            this.translate.instant('operations.operationUpdatedSuccess')
          );
          this.router.navigate(['/travels', this.travelId]);
        },
        error: () => {
          this.formGroup.enable();
          this.alertService.showError(
            this.translate.instant('operations.operationUpdatedError')
          );
          this.isSubmitting.set(false);
        }
      });
    } else {
      // Crear nueva operación
      const request = new CreateTravelOperationApiRequest(
        formValue.currencyId!,
        formValue.paymentMethodId!,
        formValue.whoPaidMemberId!,
        formValue.amount!,
        formValue.description!,
        formValue.splitType!,
        new Date(formValue.transactionDate!),
        formValue.participantMemberIds!
      );

      this.formGroup.disable();
      this.travelStore.createOperation(this.travelId, request).subscribe({
        next: () => {
          this.ignorePreventUnsavedChanges = true;
          this.alertService.showSuccess(
            this.translate.instant('operations.operationCreatedSuccess')
          );
          this.router.navigate(['/travels', this.travelId]);
        },
        error: () => {
          this.formGroup.enable();
          this.alertService.showError(
            this.translate.instant('operations.operationCreatedError')
          );
          this.isSubmitting.set(false);
        }
      });
    }
  }

  protected cancel(): void {
    if (this.travelId) {
      this.router.navigate(['/travels', this.travelId]);
    } else {
      this.router.navigate(['/travels']);
    }
  }

  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  private formatDateForInput(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toISOString().split('T')[0];
  }

  protected getFormattedDate = this.formatterService.getFormattedDate.bind(this.formatterService);
  protected formatCurrency = this.formatterService.formatCurrency;

  protected goBack(): void {
    this.location.back();
  }
}