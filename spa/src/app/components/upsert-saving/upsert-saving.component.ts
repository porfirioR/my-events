import { CommonModule, DatePipe, Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TextComponent } from '../inputs/text/text.component';
import { CheckBoxInputComponent } from '../inputs/check-box-input/check-box-input.component';
import { DateInputComponent } from '../inputs/date-input/date-input.component';
import { TextAreaInputComponent } from '../inputs/text-area-input/text-area-input.component';
import { SavingFormGroup } from '../../models/forms';
import { AlertService, LocalService, SavingApiService } from '../../services';
import { forkJoin, Observable } from 'rxjs';
import { CreateSavingApiRequest, CurrencyApiModel, PeriodApiModel, SavingApiModel, TypeApiModel, UpdateSavingApiRequest, } from '../../models/api';
import { SelectInputComponent } from '../inputs/select-input/select-input.component';
import { KeyValueViewModel } from '../../models/view/key-value-view-model';
import { ConfigurationApiService } from '../../services/configurations-api.service';
import { HelperService } from '../../services/helper.service';

@Component({
  selector: 'app-upsert-saving',
  templateUrl: './upsert-saving.component.html',
  styleUrls: ['./upsert-saving.component.css'],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    TextComponent,
    TextAreaInputComponent,
    CheckBoxInputComponent,
    DateInputComponent,
    SelectInputComponent,
  ]
})
export class UpsertSavingComponent implements OnInit {
  protected formGroup: FormGroup<SavingFormGroup>
  protected title: string
  protected model?: SavingApiModel
  protected typeList?: KeyValueViewModel[] = []
  protected periodList?: KeyValueViewModel[] = []
  protected currencyList?: KeyValueViewModel[] = []
  protected saving = false
  private types: TypeApiModel[] = []
  private periods: PeriodApiModel[] = []
  private currencies: CurrencyApiModel[] = []

  constructor(
    private readonly location: Location,
    private readonly localService: LocalService,
    private readonly activatedRoute: ActivatedRoute,
    private readonly alertService: AlertService,
    private readonly savingApiService: SavingApiService,
    private readonly configurationApiService: ConfigurationApiService,
  ) {
    this.model = this.activatedRoute.snapshot.data['saving']
    this.title = this.model ? 'Update Saving' : 'New Saving'
    let date = new Date()
    if (this.model?.date) {
      date = this.model?.date
    }
    date = new DatePipe('en-US').transform(date, 'yyyy-MM-dd', 'utc') as unknown as Date
    this.formGroup = new FormGroup<SavingFormGroup>({
      id: new FormControl(this.model?.id),
      name: new FormControl(this.model?.name, [Validators.required, Validators.maxLength(50)]),
      description: new FormControl(this.model?.description, [Validators.required, Validators.maxLength(100)]),
      date: new FormControl(date, [Validators.required]),
      savingTypeId: new FormControl(this.model?.savingTypeId, [Validators.required]),
      savingTypeDescription: new FormControl(''),
      isActive: new FormControl(this.model?.isActive),
      currencyId: new FormControl(this.model?.currencyId, [Validators.required]),
      periodId: new FormControl(this.model?.periodId),
      totalAmount: new FormControl(this.model?.totalAmount),
      numberOfPayment: new FormControl(this.model?.numberOfPayment),
    })
    this.formGroup.controls.savingTypeId.valueChanges.subscribe(this.setTypeList)
  }

  ngOnInit(): void {
    forkJoin([
      this.configurationApiService.getTypes(),
      this.configurationApiService.getPeriods(),
      this.configurationApiService.getCurrencies(),
    ])
    .subscribe({
      next: ([types, periods, currencies]) => {
        this.types = types
        this.periods = periods
        this.currencies = currencies
        this.typeList = HelperService.convertToList(types)
        this.typeList = HelperService.convertToList(periods)
        this.typeList = HelperService.convertToList(currencies)
        if (this.model) {
          this.setTypeList(this.model.savingTypeId)
        }
      }, error: (e) => {
        throw e
      }
    })
  }

  private setTypeList = (savingTypeId: number | undefined | null): void => {
    const description = this.types.find(x => x.id === savingTypeId)?.description
    this.formGroup.controls.savingTypeDescription.setValue(description)
  }

  protected cancel = (): void => this.location.back()

  protected save = (event?: Event): void => {
    event?.preventDefault()
    if (this.formGroup.invalid) {
      return
    }
    this.saving = true
    this.formGroup.disable()
    const request$ = this.model ? this.update() : this.create()
    request$.subscribe({
      next: () => {
        this.alertService.showSuccess('Saving save successfully')
        this.cancel()
      }, error: (e) => {
        this.formGroup.enable()
        this.saving = false
        throw e
      }
    })
  }

  private create = (): Observable<SavingApiModel> => {
    const request = new CreateSavingApiRequest(
      this.formGroup.value.name!,
      this.formGroup.value.description!,
      this.formGroup.value.date!,
      this.formGroup.value.savingTypeId!,
      this.formGroup.value.currencyId!,
      this.localService.getUserId()!,
      this.formGroup.value.periodId ?? undefined,
      this.formGroup.value.totalAmount ?? undefined,
      this.formGroup.value.numberOfPayment ?? undefined,
    )
    return this.savingApiService.createSaving(request)
  }

  private update = (): Observable<SavingApiModel> => {
    const request = new UpdateSavingApiRequest(
      this.formGroup.value.id!,
      this.formGroup.value.isActive ?? true,
      this.formGroup.value.name!,
      this.formGroup.value.description!,
      this.formGroup.value.date!,
      this.formGroup.value.savingTypeId!,
      this.formGroup.value.currencyId!,
      this.localService.getUserId()!,
      this.formGroup.value.periodId ?? undefined,
      this.formGroup.value.totalAmount ?? undefined,
      this.formGroup.value.numberOfPayment ?? undefined,
    )
    return this.savingApiService.updateSaving(request)
  }
}
