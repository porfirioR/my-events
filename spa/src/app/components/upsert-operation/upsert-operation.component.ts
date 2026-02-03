import { CommonModule, Location } from '@angular/common';
import { Component, OnInit, Signal, computed, effect, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { OperationFormGroup } from '../../models/forms/operation-form-group';
import { useTravelStore, useLoadingStore, useCurrencyStore } from '../../store';
import { AlertService, FormatterHelperService } from '../../services';
import { CreateTravelOperationApiRequest, OperationCategoryApiModel, UpdateTravelOperationApiRequest } from '../../models/api/travels';
import { SelectInputComponent } from '../inputs/select-input/select-input.component';
import { TextAreaInputComponent } from '../inputs/text-area-input/text-area-input.component';
import { TextComponent } from '../inputs/text/text.component';
import { DateInputComponent } from '../inputs/date-input/date-input.component';
import { CategorySelectorComponent } from '../category-selector/category-selector.component';
import { FileUploadComponent } from '../file-upload/file-upload.component';
import { KeyValueViewModel } from '../../models/view';
import { Configurations, SplitType, TravelParticipantType } from '../../models/enums';

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
    DateInputComponent,
    CategorySelectorComponent,
    FileUploadComponent
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
  protected selectedFile = signal<File | undefined>(undefined);
  protected isEditMode = signal(false);

  protected splitType = SplitType;
  protected travelParticipantType = TravelParticipantType;

  // Lista de monedas
  protected currencyList: Signal<KeyValueViewModel[]>  = computed(() => {
    return this.formatterService.convertToList(this.currencyStore.currencies(), Configurations.Currencies);
  });

  protected customSplitParticipants = computed(() => {
    const participantType = this.formGroup.value.participantType;

    let participantIds: number[] = [];

    if (participantType === TravelParticipantType.All) {
      participantIds = this.members().map(m => m.id);
    } else if (participantType === TravelParticipantType.Selected) {
      participantIds = this.selectedParticipants();
      // ✅ No mostrar si no hay participantes seleccionados
      if (participantIds.length === 0) {
        return [];
      }
    }

    return participantIds.map(id => {
      const member = this.members().find(m => m.id === id);
      const existing = this.customSplitData().find(d => d.memberId === id);

      return {
        memberId: id,
        memberName: member ? `${member.collaboratorName} ${member.collaboratorSurname}` : 'Unknown',
        amount: existing?.amount || 0,
        percentage: existing?.percentage || 0
      };
    });
  });

  protected isSubmitting = signal<boolean>(false);
  protected customSplitData = signal<{memberId: number, memberName: string, amount?: number, percentage?: number}[]>([]);
  protected participantControls = signal<{ [key: string]: FormControl }>({});

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
  

  // ✅ COMPUTED: Validaciones para custom splits
  protected isCustomSplitValid = computed(() => {
    const splitType = this.formGroup.value.splitType;
    const amount = this.formGroup.value.amount || 0;

    if (splitType === this.splitType.Custom) {
      const totalCustom = this.customSplitData().reduce((sum, d) => sum + (d.amount || 0), 0);
      return Math.abs(totalCustom - amount) <= 0.01;
    }

    if (splitType === this.splitType.Percentage) {
      const totalPercentage = this.customSplitData().reduce((sum, d) => sum + (d.percentage || 0), 0);
      return Math.abs(totalPercentage - 100) <= 0.01;
    }

    return true;
  });

  // ✅ COMPUTED: Información de split para mostrar
  protected readonly splitSummary = computed(() => {
    const splitType = this.formGroup.value.splitType;
    const amount = this.formGroup.value.amount || 0;
    const participantCount = this.customSplitParticipants().length;

    if (splitType === this.splitType.Equal) {
      return {
        type: 'equal',
        perPerson: participantCount > 0 ? amount / participantCount : 0,
        isValid: true
      };
    }

    if (splitType === this.splitType.Custom) {
      const total = this.customSplitData().reduce((sum, d) => sum + (d.amount || 0), 0);
      return {
        type: 'custom',
        totalAssigned: total,
        difference: total - amount,
        isValid: Math.abs(total - amount) <= 0.01
      };
    }

    if (splitType === this.splitType.Percentage) {
      const totalPercentage = this.customSplitData().reduce((sum, d) => sum + (d.percentage || 0), 0);
      return {
        type: 'percentage',
        totalPercentage,
        difference: totalPercentage - 100,
        isValid: Math.abs(totalPercentage - 100) <= 0.01
      };
    }

    return { type: 'unknown', isValid: false };
  });

  protected participantTypeList: KeyValueViewModel[] = [
    new KeyValueViewModel(TravelParticipantType.All, this.translate.instant('operations.allMembers'), ''),
    new KeyValueViewModel(TravelParticipantType.Selected, this.translate.instant('operations.selectedMembers'), '')
  ];

  // Tipos de split
  protected splitTypeList: KeyValueViewModel[] = [
    new KeyValueViewModel(this.splitType.Equal, this.translate.instant('operations.equal'), ''),
    new KeyValueViewModel(this.splitType.Custom, this.translate.instant('operations.custom'), ''),
    new KeyValueViewModel(this.splitType.Percentage, this.translate.instant('operations.percentage'), '')
  ];

  // Participantes seleccionados
  protected selectedParticipants = signal<number[]>([]);
  
  protected activeCategories = this.travelStore.activeCategories;

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
      participantType: new FormControl(TravelParticipantType.All, [Validators.required]),
      splitType: new FormControl(SplitType.Equal, [Validators.required]),
      transactionDate: new FormControl(this.getTodayDate(), [Validators.required]),
      participantMemberIds: new FormControl<number[]>([]),
      customAmounts:new FormControl<number[]>([]),
      customPercentages: new FormControl<number[]>([]),
      categoryId: new FormControl(1, [Validators.required])
    });

    // ✅ Effect para establecer moneda por defecto cuando se carga el travel
    effect(() => {
      const travel = this.travel();
      if (travel && travel.defaultCurrencyId && !this.formGroup.value.currencyId) {
        console.log('🏦 Setting default currency:', travel.defaultCurrencyId);
        this.formGroup.patchValue({
          currencyId: travel.defaultCurrencyId
        });
      }
    });

    // ✅ NUEVO: Effect para manejar cambio de participantType
    effect(() => {
      const participantType = this.formGroup.value.participantType;

      if (participantType === TravelParticipantType.All) {
        // Auto-seleccionar todos los miembros
        const allMemberIds = this.members().map(m => m.id);
        if (allMemberIds.length > 0) {  // ✅ Protección: solo si hay miembros
          this.selectedParticipants.set(allMemberIds);
          this.formGroup.patchValue({
            participantMemberIds: allMemberIds
          });
        }
      } else if (participantType === TravelParticipantType.Selected) {
        // Limpiar selección para que usuario elija manualmente
        this.selectedParticipants.set([]);
        this.formGroup.patchValue({
          participantMemberIds: []
        });
      }
    });

    // ✅ NUEVO: Effect para inicializar custom split data
    effect(() => {
      const participantIds = this.customSplitParticipants().map(p => p.memberId);
      const amount = this.formGroup.value.amount || 0;
      const splitType = this.formGroup.value.splitType;

      // ✅ PROTECCIÓN: Solo procesar si hay datos válidos
      if (participantIds.length > 0 && amount > 0 && splitType === this.splitType.Equal) {
        const equalAmount = amount / participantIds.length;
        const equalPercentage = 100 / participantIds.length;

        const newData = participantIds.map(id => {
          const member = this.members().find(m => m.id === id);
          return {
            memberId: id,
            memberName: member ? `${member.collaboratorName} ${member.collaboratorSurname}` : 'Unknown',
            amount: equalAmount,
            percentage: equalPercentage
          };
        });

        // ✅ PROTECCIÓN: Solo actualizar si los datos cambiaron
        const current = this.customSplitData();
        if (JSON.stringify(current) !== JSON.stringify(newData)) {
          console.log('💰 Updating custom split data');
          this.customSplitData.set(newData);
        }
      }
    });

    effect(() => {
      const participants = this.customSplitParticipants();
      const controls: { [key: string]: FormControl } = {};

      participants.forEach(participant => {
        // Crear controls para amounts y percentages
        const amountControl = new FormControl(participant.amount || 0);
        const percentageControl = new FormControl(participant.percentage || 0);
        
        controls[`amount-${participant.memberId}`] = amountControl;
        controls[`percentage-${participant.memberId}`] = percentageControl;
        
        // ✅ Suscribirse a cambios del FormControl
        amountControl.valueChanges.subscribe(value => {
          this.onCustomAmountChange(participant.memberId, parseFloat(value as any ?? '0'));
        });
        
        percentageControl.valueChanges.subscribe(value => {
          this.onCustomPercentageChange(participant.memberId, parseFloat(value as any ?? '0'));
        });
      });
      
      this.participantControls.set(controls);
    });

    // // Effect para cargar la operación en modo edición
    // effect(() => {
    //   if (this.isEditMode() && this.operationId && this.travelId) {
    //     this.travelStore.loadOperations(this.travelId);
    //     const operation = this.travelStore.operations().find(op => op.id === this.operationId);

    //     if (operation) {
    //       this.formGroup.patchValue({
    //         id: operation.id,
    //         currencyId: operation.currencyId,
    //         paymentMethodId: operation.paymentMethodId,
    //         whoPaidMemberId: operation.whoPaidMemberId,
    //         amount: operation.amount,
    //         description: operation.description,
    //         splitType: operation.splitType,
    //         transactionDate: this.formatDateForInput(operation.transactionDate)
    //       });

    //       // TODO: Cargar participantMemberIds desde el backend si está disponible
    //       this.selectedParticipants.set([]);
    //     }
    //   }

    //   // Auto-seleccionar categoría "Other" por defecto si no hay ninguna
    //   if (this.activeCategories().length > 0 && !this.formGroup.value.categoryId) {
    //     const otherCategory = this.activeCategories().find(cat => cat.name === 'Other');
    //     if (otherCategory) {
    //       this.formGroup.patchValue({ categoryId: otherCategory.id });
    //     }
    //   }
    // });
  }

  ngOnInit(): void {
    const travelId = this.activatedRoute.snapshot.params['travelId'];
    const operationId = this.activatedRoute.snapshot.params['operationId'];

    if (travelId) {
      this.travelId = +travelId;
      this.loadRequiredData();
    }

    if (operationId) {
      this.operationId = +operationId;
      this.isEditMode.set(true);
    }
  }

  protected onCategorySelected(category: OperationCategoryApiModel | undefined): void {
    this.formGroup.patchValue({
      categoryId: category?.id || null
    });
  }

  protected onFileSelected(file: File | undefined): void {
    this.selectedFile.set(file);
  }

  protected toggleParticipant(memberId: number): void {
    if (this.formGroup.value.participantType === TravelParticipantType.All) return; // No permitir cambios si es "All"

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
    if (this.formGroup.invalid || !this.isCustomSplitValid()) {
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
        formValue.participantType! as TravelParticipantType,
        formValue.splitType! as SplitType,
        new Date(formValue.transactionDate!),
        formValue.participantMemberIds!,
        formValue.categoryId!,
        formValue.customAmounts ?? undefined,
        formValue.customPercentages ?? undefined
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
        formValue.participantType! as TravelParticipantType,
        formValue.splitType! as SplitType,
        new Date(formValue.transactionDate!),
        formValue.participantMemberIds!,
        formValue.categoryId!,
        formValue.customAmounts ?? undefined,
        formValue.customPercentages ?? undefined
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

    // Métodos para manejar custom splits
  protected onCustomAmountChange(memberId: number, newValue: number): void {
    const updated = this.customSplitData().map(d => 
      d.memberId === memberId ? { ...d, amount: newValue } : d
    );
    this.customSplitData.set(updated);
    
    this.formGroup.patchValue({
      customAmounts: updated.map(d => d.amount || 0)
    });
  }

  protected onCustomPercentageChange(memberId: number, newValue: number): void {
    const updated = this.customSplitData().map(d => 
      d.memberId === memberId ? { ...d, percentage: newValue } : d
    );
    this.customSplitData.set(updated);
    
    this.formGroup.patchValue({
      customPercentages: updated.map(d => d.percentage || 0)
    });
  }

  protected getCurrencySymbol(currencyId: number): string {
    const currency = this.currencyStore.getCurrencyById()(currencyId);
    return currency?.symbol || '$';
  }

  protected getParticipantControl(type: 'amount' | 'percentage', memberId: number): FormControl {
    const controls = this.participantControls();
    const key = `${type}-${memberId}`;
    return controls[key] || new FormControl(0);
  }


  private loadRequiredData(): void {
    console.log('📡 Starting data load for travel:', this.travelId!);

    //Check this parts
    this.travelStore.loadTravelById(this.travelId!);
    this.travelStore.loadMembers(this.travelId!);
    this.travelStore.loadPaymentMethods();
    this.travelStore.loadCategories();
    this.currencyStore.loadCurrencies();

    console.log('✅ All load methods called');
  }
}