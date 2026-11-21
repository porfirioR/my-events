import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { map, startWith } from 'rxjs';
import { FileUploadComponent } from '../file-upload/file-upload.component';
import { FormatterHelperService } from '../../services';
import { useCurrencyStore, useImportsStore } from '../../store';
import { LanguageLocales } from '../../constants';
import { MyMoneyIssueApiModel, MyMoneyMonthSummaryApiModel, MyMoneyTotalsApiModel } from '../../models/api/imports/mymoney-preview-api.model';

// El export de MyMoney es siempre en guaraníes
const GUARANI_CURRENCY_ID = 4;
const MAX_EXPORT_SIZE = 10 * 1024 * 1024;

interface IssueView {
  path: string;
  message: string;
}

interface YearView {
  year: string;
  months: (MyMoneyMonthSummaryApiModel & { label: string })[];
  totals: MyMoneyTotalsApiModel;
}

// Lee el export de MyMoney y muestra el resumen por mes (#230); al subirlo suma las categorías nuevas
// al mapeo (#231) y, después de revisarlo, "Importar" guarda los movimientos sin duplicar (#232).
@Component({
  selector: 'app-mymoney-import',
  templateUrl: './mymoney-import.component.html',
  imports: [CommonModule, RouterModule, TranslateModule, FileUploadComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyMoneyImportComponent {
  private translate = inject(TranslateService);
  private formatterService = inject(FormatterHelperService);
  private importsStore = useImportsStore();
  private currencyStore = useCurrencyStore();

  protected readonly maxSize = MAX_EXPORT_SIZE;
  protected preview = this.importsStore.myMoneyPreview;
  protected isLoading = computed(() => this.importsStore.isMyMoneyPreviewLoading() || this.importsStore.isCategorySyncLoading());
  protected sync = this.importsStore.categorySync;
  protected pendingCount = computed(() => this.importsStore.categoryMappings().filter(mapping => mapping.needsReview).length);
  protected hasError = computed(() => !!this.importsStore.myMoneyPreviewError());
  protected summary = computed(() => this.preview()?.summary ?? null);
  private selectedFile = signal<File | null>(null);
  // Sin el archivo en memoria (p. ej. al volver a la pantalla con el resumen anterior) no hay qué importar
  protected canImport = computed(() => !!this.selectedFile() && !!this.preview()?.valid);
  protected importResult = this.importsStore.myMoneyImport;
  protected isImporting = this.importsStore.isMyMoneyImporting;
  protected hasImportError = computed(() => !!this.importsStore.myMoneyImportError());
  protected importErrors = computed(() => this.toIssueViews(this.importResult()?.errors ?? []));
  // Grupos del resumen del import en el orden en que se muestran
  protected importGroups = computed(() => {
    const classification = this.importResult()?.classification;
    if (!classification) return [];
    return [
      { label: 'myMoneyImport.result.consumption', total: classification.consumption, tone: '' },
      { label: 'myMoneyImport.result.transfer', total: classification.transfer, tone: '' },
      { label: 'myMoneyImport.result.income', total: classification.income, tone: '' },
      { label: 'myMoneyImport.result.refund', total: classification.refund, tone: '' },
      { label: 'myMoneyImport.result.unclassified', total: classification.unclassified, tone: classification.unclassified.count > 0 ? 'text-warning' : '' },
    ];
  });

  private language = toSignal(
    this.translate.onLangChange.pipe(map(event => event.lang), startWith(this.translate.getCurrentLang())),
    { initialValue: this.translate.getCurrentLang() },
  );
  private locale = computed(() => LanguageLocales[this.language() ?? 'en'] ?? 'en-US');

  protected errors = computed(() => this.toIssueViews(this.preview()?.errors ?? []));
  protected warnings = computed(() => this.toIssueViews(this.preview()?.warnings ?? []));

  // Meses agrupados por año, con subtotal: así se compara directo con los reportes anuales de MyMoney
  protected years = computed<YearView[]>(() => {
    const summary = this.summary();
    if (!summary) return [];
    const locale = this.locale();
    const byYear = new Map<string, YearView>();
    summary.months.forEach(m => {
      const year = m.month.slice(0, 4);
      const view = byYear.get(year) ?? { year, months: [], totals: { movementCount: 0, incomeCount: 0, expenseCount: 0, income: 0, expense: 0, net: 0 } };
      const label = new Date(+year, +m.month.slice(5, 7) - 1, 1).toLocaleDateString(locale, { month: 'long' });
      view.months.push({ ...m, label });
      view.totals.movementCount += m.movementCount;
      view.totals.incomeCount += m.incomeCount;
      view.totals.expenseCount += m.expenseCount;
      view.totals.income += m.income;
      view.totals.expense += m.expense;
      view.totals.net += m.net;
      byYear.set(year, view);
    });
    return [...byYear.values()];
  });

  // MyMoney guarda las categorías predeterminadas con su clave en inglés y las traduce al mostrarlas;
  // las creadas por el usuario tienen el nombre tal cual lo escribió y no tienen traducción
  private categoryNames = computed<Record<string, string>>(() => {
    this.language();
    const names = this.translate.instant('myMoneyImport.categoryNames');
    return typeof names === 'object' && names ? names : {};
  });

  protected categoryName = (name: string): string => this.categoryNames()[name] ?? name;

  protected incomeCategories = computed(() => (this.summary()?.categories ?? []).filter(c => c.type === 'income'));
  protected expenseCategories = computed(() => (this.summary()?.categories ?? []).filter(c => c.type === 'expense'));

  constructor() {
    this.currencyStore.loadCurrencies();
  }

  // El mismo archivo sirve para revisar los movimientos y para sumar las categorías nuevas al mapeo
  // (un archivo inválido no guarda nada)
  protected onFileSelected = (file: File | undefined): void => {
    this.selectedFile.set(file ?? null);
    if (file) {
      this.importsStore.clearMyMoneyPreview();
      this.importsStore.previewMyMoney(file);
      this.importsStore.syncCategoryMappings(file);
    } else {
      this.importsStore.clearMyMoneyPreview();
      this.importsStore.clearCategorySync();
    }
  };

  // Guarda los movimientos del archivo ya revisado; reimportarlo no duplica (#232)
  protected importMovements = (): void => {
    const file = this.selectedFile();
    if (file && this.canImport() && !this.isImporting()) {
      this.importsStore.importMyMoney(file);
    }
  };

  protected money = (amount: number): string => this.formatterService.formatCurrency(amount, GUARANI_CURRENCY_ID);

  protected formatDate = (value: string): string => {
    // 'YYYY-MM-DD' es fecha local: armar la fecha sin pasar por UTC
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(this.locale(), { day: 'numeric', month: 'short', year: 'numeric' });
  };

  protected formatDateTime = (value: string): string => {
    const date = new Date(value);
    return isNaN(date.getTime()) ? value : date.toLocaleString(this.locale(), { dateStyle: 'medium', timeStyle: 'short' });
  };

  private toIssueViews(issues: MyMoneyIssueApiModel[]): IssueView[] {
    this.language(); // recalcular al cambiar de idioma
    return issues.map(issue => {
      const key = `myMoneyImport.issues.${issue.code}`;
      const translated = this.translate.instant(key, issue.params ?? {});
      return { path: issue.path, message: translated === key ? issue.code : translated };
    });
  }
}
