import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit,
  inject, effect, computed, signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { preventUnsavedUnload } from '../../guards/prevent-unsaved-unload';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { TextComponent } from '../inputs/text/text.component';
import { SelectInputComponent } from '../inputs/select-input/select-input.component';
import { TextAreaInputComponent } from '../inputs/text-area-input/text-area-input.component';
import { CheckBoxInputComponent } from '../inputs/check-box-input/check-box-input.component';
import { InstitutionSelectorComponent } from '../institution-selector/institution-selector.component';
import { AlertService, FormatterHelperService } from '../../services';
import { useAccountsStore } from '../../store/accounts.store';
import { useCurrencyStore } from '../../store/currency.store';
import { useFinancialInstitutionsStore } from '../../store/financial-institutions.store';
import { KeyValueViewModel } from '../../models/view/key-value-view-model';
import { AccountType, AccountTypeLabels, Configurations, FinancialInstitutionType } from '../../models/enums';
import { CreateAccountApiRequest, UpdateAccountApiRequest } from '../../models/api/accounts';

const GUARANI_CURRENCY_ID = 4;

interface AccountFormGroup {
  id: FormControl<number | null>;
  name: FormControl<string | null>;
  type: FormControl<number | null>;
  institutionId: FormControl<number | null>;
  currencyId: FormControl<number | null>;
  notes: FormControl<string | null>;
  isActive: FormControl<boolean>;
}

@Component({
  selector: 'app-upsert-account',
  templateUrl: './upsert-account.component.html',
  styleUrls: ['./upsert-account.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule, TranslateModule,
    TextComponent, SelectInputComponent, TextAreaInputComponent, CheckBoxInputComponent, InstitutionSelectorComponent,
  ],
})
export class UpsertAccountComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private alertService = inject(AlertService);
  private formatterService = inject(FormatterHelperService);
  private translate = inject(TranslateService);
  private accountsStore = useAccountsStore();
  private currencyStore = useCurrencyStore();
  private financialInstitutionsStore = useFinancialInstitutionsStore();

  protected isEditMode = false;
  protected saving = signal(false);
  public ignorePreventUnsavedChanges = false;
  private accountId = signal<number | null>(null);
  private isLoaded = false;

  protected currencyList: KeyValueViewModel[] = [];

  // stream (no instant): si las traducciones todavía no cargaron, instant devuelve la clave
  private translations = toSignal(
    this.translate.stream(Object.values(AccountTypeLabels)),
    { initialValue: {} as Record<string, string> }
  );

  protected typeList = computed(() => {
    const t = this.translations();
    return [AccountType.Checking, AccountType.SavingsAccount, AccountType.Cash].map(type =>
      new KeyValueViewModel(type, t[AccountTypeLabels[type]] ?? AccountTypeLabels[type], '')
    );
  });

  public formGroup: FormGroup<AccountFormGroup>;

  constructor() {
    preventUnsavedUnload(this);
    this.formGroup = new FormGroup<AccountFormGroup>({
      id: new FormControl(null),
      name: new FormControl(null, [Validators.required, Validators.maxLength(100)]),
      type: new FormControl(AccountType.SavingsAccount, [Validators.required]),
      institutionId: new FormControl(null, [Validators.required]),
      currencyId: new FormControl(GUARANI_CURRENCY_ID, [Validators.required]),
      notes: new FormControl(null),
      isActive: new FormControl(true, { nonNullable: true }),
    });

    this.formGroup.controls.type.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(type => this.onTypeChange(+(type ?? 0)));

    effect(() => {
      const currencies = this.currencyStore.getAllCurrencies();
      if (currencies.length > 0) {
        this.currencyList = this.formatterService.convertToList(currencies, Configurations.Currencies);
      }
    });

    // Edición: carga la cuenta cuando llega del store (una sola vez, para no pisar lo que se edita)
    effect(() => {
      const id = this.accountId();
      const account = id ? this.accountsStore.accountsById().get(id) : undefined;
      if (!account || this.isLoaded) return;
      this.isLoaded = true;
      this.formGroup.patchValue({
        id: account.id,
        name: account.name,
        type: account.type,
        institutionId: account.institutionId,
        currencyId: account.currencyId,
        notes: account.notes,
        isActive: account.isActive,
      }, { emitEvent: false });
    });
  }

  ngOnInit(): void {
    const id = this.activatedRoute.snapshot.params['id'];
    if (id) {
      this.isEditMode = true;
      this.accountId.set(+id);
    }
    this.accountsStore.loadAccounts();
    this.currencyStore.loadCurrencies();
    this.financialInstitutionsStore.loadFinancialInstitutions();
  }

  // Efectivo → la entidad "Efectivo" (tipo Cash); al salir de efectivo se limpia para elegir el banco
  private onTypeChange(type: number): void {
    const cashInstitution = this.financialInstitutionsStore.financialInstitutions()
      .find(f => f.type === FinancialInstitutionType.Cash);
    if (!cashInstitution) return;
    const institutionControl = this.formGroup.controls.institutionId;
    if (type === AccountType.Cash && !institutionControl.value) {
      institutionControl.setValue(cashInstitution.id);
    } else if (type !== AccountType.Cash && institutionControl.value === cashInstitution.id) {
      institutionControl.setValue(null);
    }
  }

  protected save = (event?: Event): void => {
    event?.preventDefault();
    if (this.formGroup.invalid) { this.formGroup.markAllAsTouched(); return; }
    this.saving.set(true);
    const values = this.formGroup.getRawValue();
    this.formGroup.disable({ emitEvent: false });

    // Los selects y app-text devuelven string: convertir antes de enviar
    const request$ = this.isEditMode
      ? this.accountsStore.updateAccount(values.id!, new UpdateAccountApiRequest(
        +values.institutionId!, +values.currencyId!, values.name!, +values.type!, values.isActive, values.notes || null,
      ))
      : this.accountsStore.createAccount(new CreateAccountApiRequest(
        +values.institutionId!, +values.currencyId!, values.name!, +values.type!, values.notes || null,
      ));
    const messagePrefix = this.isEditMode ? 'upsertAccount.updated' : 'upsertAccount.created';

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.ignorePreventUnsavedChanges = true;
        this.alertService.showSuccess(this.translate.instant(`${messagePrefix}Success`));
        this.exit();
      },
      error: (e) => {
        this.formGroup.enable({ emitEvent: false });
        this.saving.set(false);
        this.alertService.showError(this.translate.instant(`${messagePrefix}Error`));
        throw e;
      },
    });
  };

  protected cancel = (): void => { this.exit(); };
  protected exit = (): void => { this.router.navigate(['/accounts']); };
}
