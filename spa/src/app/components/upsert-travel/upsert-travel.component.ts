import { CommonModule, DatePipe } from '@angular/common';
import { Component, effect, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TextComponent } from '../inputs/text/text.component';
import { TextAreaInputComponent } from '../inputs/text-area-input/text-area-input.component';
import { DateInputComponent } from '../inputs/date-input/date-input.component';
import { SelectInputComponent } from '../inputs/select-input/select-input.component';
import { TravelFormGroup } from '../../models/forms/travel-form-group';
import { TravelApiModel, CreateTravelApiRequest, UpdateTravelApiRequest } from '../../models/api/travels';
import { useTravelStore, useLoadingStore, useCurrencyStore } from '../../store';
import { AlertService, FormatterHelperService } from '../../services';
import { KeyValueViewModel } from '../../models/view/key-value-view-model';
import { Configurations } from '../../models/enums';

@Component({
  selector: 'app-upsert-travel',
  templateUrl: './upsert-travel.component.html',
  styleUrls: ['./upsert-travel.component.css'],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    TranslateModule,
    TextComponent,
    TextAreaInputComponent,
    DateInputComponent,
    SelectInputComponent,
  ]
})
export class UpsertTravelComponent implements OnInit {
  private router = inject(Router);
  private alertService = inject(AlertService);
  private translate = inject(TranslateService);
  private activatedRoute = inject(ActivatedRoute);
  private formatterService = inject(FormatterHelperService);

  private travelStore = useTravelStore();
  private loadingStore = useLoadingStore();
  private currencyStore = useCurrencyStore();

  protected isLoading = this.loadingStore.isLoading;
  protected selectedTravel = this.travelStore.selectedTravel;

  protected isEditMode = false;
  protected travel?: TravelApiModel;
  protected currencyList: KeyValueViewModel[] = [];

  public formGroup: FormGroup<TravelFormGroup>;
  public ignorePreventUnsavedChanges = false;

  constructor() {
    const today = new DatePipe('en-US').transform(new Date(), 'yyyy-MM-dd', 'UTC') as string;

    this.formGroup = new FormGroup<TravelFormGroup>({
      id: new FormControl(null),
      name: new FormControl('', [Validators.required, Validators.maxLength(200)]),
      description: new FormControl('', [Validators.maxLength(500)]),
      startDate: new FormControl(today, [Validators.required]),
      endDate: new FormControl(null),
      defaultCurrencyId: new FormControl(null, [Validators.required]),
    });

    effect(() => {
      this.travel = this.selectedTravel();
      if (this.travel && this.isEditMode) {
        this.loadTravelIntoForm(this.travel);
      }
    });

    effect(() => {
      const currencies = this.currencyStore.getAllCurrencies();
      if (currencies.length > 0) {
        this.currencyList = this.formatterService.convertToList(currencies, Configurations.Currencies);
      }
    });
  }

  ngOnInit() {
    const id = this.activatedRoute.snapshot.params['id'];
    if (id) {
      this.isEditMode = true;
      this.travelStore.loadTravelById(+id);
    } else {
      this.travelStore.clearSelectedTravel();
    }

    this.currencyStore.loadCurrencies();
  }

  private loadTravelIntoForm(travel: TravelApiModel): void {
    const startDate = travel.startDate 
      ? new DatePipe('en-US').transform(new Date(travel.startDate), 'yyyy-MM-dd', 'UTC') as string
      : null;
    const endDate = travel.endDate 
      ? new DatePipe('en-US').transform(new Date(travel.endDate), 'yyyy-MM-dd', 'UTC') as string
      : null;

    this.formGroup.patchValue({
      id: travel.id,
      name: travel.name,
      description: travel.description,
      startDate: startDate,
      endDate: endDate,
      defaultCurrencyId: travel.defaultCurrencyId,
    });
  }

  protected save = (event?: Event): void => {
    event?.preventDefault();
    if (this.formGroup.invalid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const values = this.formGroup.getRawValue();

    if (this.isEditMode) {
      const request = new UpdateTravelApiRequest(
        values.name!,
        values.description,
        values.startDate,
        values.endDate,
        values.defaultCurrencyId
      );

      this.travelStore.updateTravel(values.id!, request).subscribe({
        next: () => {
          this.ignorePreventUnsavedChanges = true;
          this.alertService.showSuccess(
            this.translate.instant('travels.travelUpdatedSuccess')
          );
          this.exit();
        },
        error: (e) => {
          this.alertService.showError(
            this.translate.instant('travels.travelUpdatedError')
          );
          this.formGroup.enable();
          throw e;
        }
      });
    } else {
      const request = new CreateTravelApiRequest(
        values.name!,
        values.description,
        values.startDate,
        values.endDate,
        values.defaultCurrencyId
      );

      this.travelStore.createTravel(request).subscribe({
        next: () => {
          this.ignorePreventUnsavedChanges = true;
          this.alertService.showSuccess(
            this.translate.instant('travels.travelCreatedSuccess')
          );
          this.exit();
        },
        error: (e) => {
          this.alertService.showError(
            this.translate.instant('travels.travelCreatedError')
          );
          this.formGroup.enable();
          throw e;
        }
      });
    }
  };

  protected cancel = (): void => {
    this.exit();
  };

  protected exit = (): void => {
    this.router.navigate(['/travels']);
  };
}