import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { preventUnsavedUnload } from '../../guards/prevent-unsaved-unload';
import { TextComponent } from '../inputs/text/text.component';
import { AlertService } from '../../services';
import { useDashboardStore } from '../../store';
import { UpsertFinancialSettingsApiRequest } from '../../models/api/dashboard/financial-health-api.model';

interface FinancialSettingsFormGroup {
  monthlyNetIncome: FormControl<number | null>;
  monthlyEssentialExpense: FormControl<number | null>;
  cushionGreenMonths: FormControl<number | null>;
  cushionYellowMonths: FormControl<number | null>;
  savingsGreenPercentage: FormControl<number | null>;
  savingsYellowPercentage: FormControl<number | null>;
  debtGreenPercentage: FormControl<number | null>;
  debtYellowPercentage: FormControl<number | null>;
}

// El verde tiene que ser más exigente que el amarillo (en cuotas, más bajo es mejor)
const thresholdOrder = (green: keyof FinancialSettingsFormGroup, yellow: keyof FinancialSettingsFormGroup, lowerIsBetter: boolean, error: string): ValidatorFn =>
  (group: AbstractControl): ValidationErrors | null => {
    const g = group.get(green)?.value;
    const y = group.get(yellow)?.value;
    if (g === null || g === '' || y === null || y === '') return null;
    const valid = lowerIsBetter ? +g <= +y : +g >= +y;
    return valid ? null : { [error]: true };
  };

// Parámetros manuales de los indicadores de salud financiera (#228); en la fase 5 el ingreso y el gasto vienen de MyMoney
@Component({
  selector: 'app-financial-settings',
  templateUrl: './financial-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslateModule, TextComponent],
})
export class FinancialSettingsComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private alertService = inject(AlertService);
  private translate = inject(TranslateService);
  private dashboardStore = useDashboardStore();

  protected saving = signal(false);
  public ignorePreventUnsavedChanges = false;

  public formGroup = new FormGroup<FinancialSettingsFormGroup>({
    monthlyNetIncome: new FormControl(null, [Validators.min(1)]),
    monthlyEssentialExpense: new FormControl(null, [Validators.min(1)]),
    cushionGreenMonths: new FormControl(6, [Validators.required, Validators.min(0), Validators.max(999)]),
    cushionYellowMonths: new FormControl(3, [Validators.required, Validators.min(0), Validators.max(999)]),
    savingsGreenPercentage: new FormControl(20, [Validators.required, Validators.min(0), Validators.max(999)]),
    savingsYellowPercentage: new FormControl(10, [Validators.required, Validators.min(0), Validators.max(999)]),
    debtGreenPercentage: new FormControl(30, [Validators.required, Validators.min(0), Validators.max(999)]),
    debtYellowPercentage: new FormControl(40, [Validators.required, Validators.min(0), Validators.max(999)]),
  }, {
    validators: [
      thresholdOrder('cushionGreenMonths', 'cushionYellowMonths', false, 'cushionOrder'),
      thresholdOrder('savingsGreenPercentage', 'savingsYellowPercentage', false, 'savingsOrder'),
      thresholdOrder('debtGreenPercentage', 'debtYellowPercentage', true, 'debtOrder'),
    ],
  });

  constructor() {
    preventUnsavedUnload(this);
  }

  ngOnInit(): void {
    this.dashboardStore.loadFinancialSettings().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: settings => {
        const t = settings.thresholds;
        this.formGroup.reset({
          monthlyNetIncome: settings.monthlyNetIncome,
          monthlyEssentialExpense: settings.monthlyEssentialExpense,
          cushionGreenMonths: t.cushionGreenMonths,
          cushionYellowMonths: t.cushionYellowMonths,
          savingsGreenPercentage: t.savingsGreenPercentage,
          savingsYellowPercentage: t.savingsYellowPercentage,
          debtGreenPercentage: t.debtGreenPercentage,
          debtYellowPercentage: t.debtYellowPercentage,
        });
      },
      error: (e) => {
        this.alertService.showError(this.translate.instant('financialSettings.loadError'));
        throw e;
      },
    });
  }

  protected save = (event?: Event): void => {
    event?.preventDefault();
    if (this.formGroup.invalid) { this.formGroup.markAllAsTouched(); return; }
    this.saving.set(true);
    const v = this.formGroup.getRawValue();
    this.formGroup.disable({ emitEvent: false });

    // app-text devuelve string: convertir antes de enviar; vacío = sin cargar
    const amount = (value: number | null) => (value === null || `${value}` === '' ? null : +value);
    const request = new UpsertFinancialSettingsApiRequest(
      amount(v.monthlyNetIncome),
      amount(v.monthlyEssentialExpense),
      +v.cushionGreenMonths!, +v.cushionYellowMonths!,
      +v.savingsGreenPercentage!, +v.savingsYellowPercentage!,
      +v.debtGreenPercentage!, +v.debtYellowPercentage!,
    );

    this.dashboardStore.saveFinancialSettings(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.ignorePreventUnsavedChanges = true;
        this.alertService.showSuccess(this.translate.instant('financialSettings.savedSuccess'));
        this.exit();
      },
      error: (e) => {
        this.formGroup.enable({ emitEvent: false });
        this.saving.set(false);
        this.alertService.showError(this.translate.instant('financialSettings.savedError'));
        throw e;
      },
    });
  };

  protected exit = (): void => { this.router.navigate(['/']); };
}
