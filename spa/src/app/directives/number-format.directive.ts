import { DestroyRef, Directive, ElementRef, forwardRef, HostListener, inject, Input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { LanguageLocales } from '../constants';

interface Separators {
  group: string;
  decimal: string;
}

/**
 * Input numérico con separador de miles según el idioma de la app
 * (es: 1.500.000,5 / en: 1,500,000.5). El control recibe un number (o null si está vacío).
 * Cualquier '.' o ',' que escribe el usuario se toma como decimal: el separador de miles
 * lo pone solo el formato (así 22.71 o 22,71 son ambos una tasa válida).
 * Con [allowDecimals]="false" (cantidades de cuotas, porcentajes enteros) no acepta decimales.
 */
@Directive({
  selector: 'input[appNumberFormat]',
  standalone: true,
  host: { type: 'text', '[attr.inputmode]': "allowDecimals ? 'decimal' : 'numeric'" },
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => NumberFormatDirective), multi: true }],
})
export class NumberFormatDirective implements ControlValueAccessor {
  @Input() allowDecimals = true;

  private readonly input = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private readonly translate = inject(TranslateService);
  private value: number | null = null;
  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => this.input.value = this.formatNumber(this.value));
  }

  writeValue(value: number | string | null): void {
    const parsed = value === null || value === undefined || value === '' ? null : Number(value);
    this.value = parsed === null || isNaN(parsed) ? null : this.allowDecimals ? parsed : Math.trunc(parsed);
    this.input.value = this.formatNumber(this.value);
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.input.disabled = isDisabled;
  }

  // '.' o ',' tipeados → separador decimal del idioma (el teclado del celular puede tener el otro)
  @HostListener('beforeinput', ['$event'])
  protected onBeforeInput(event: InputEvent): void {
    if (event.inputType !== 'insertText' || (event.data !== '.' && event.data !== ',')) return;
    const { decimal } = this.separators();
    if (!this.allowDecimals) {
      event.preventDefault();
      return;
    }
    if (event.data === decimal) return;
    event.preventDefault();
    const start = this.input.selectionStart ?? this.input.value.length;
    const end = this.input.selectionEnd ?? start;
    this.input.setRangeText(decimal, start, end, 'end');
    this.onInput();
  }

  @HostListener('input')
  protected onInput(): void {
    const { decimal } = this.separators();
    const raw = this.input.value;
    const caret = this.input.selectionStart ?? raw.length;
    // Caracteres significativos (dígitos, decimal, signo) a la izquierda del cursor
    const significantBeforeCaret = this.clean(raw.slice(0, caret), decimal).length;

    const cleaned = this.clean(raw, decimal);
    const formatted = this.formatRaw(cleaned);
    this.input.value = formatted;
    this.input.setSelectionRange(...this.caretRange(formatted, significantBeforeCaret, decimal));

    const numeric = cleaned.replace(decimal, '.');
    this.value = numeric === '' || numeric === '-' || numeric === '.' ? null : Number(numeric);
    this.onChange(this.value);
  }

  @HostListener('blur')
  protected onBlur(): void {
    // Saca el decimal colgado ("12," → "12")
    this.input.value = this.formatNumber(this.value);
    this.onTouched();
  }

  private separators(): Separators {
    const lang = this.translate.getCurrentLang() || this.translate.getFallbackLang() || 'en';
    const parts = new Intl.NumberFormat(LanguageLocales[lang] ?? 'en-US').formatToParts(1000000.5);
    return {
      group: parts.find(p => p.type === 'group')?.value ?? ',',
      decimal: parts.find(p => p.type === 'decimal')?.value ?? '.',
    };
  }

  // Deja solo signo inicial, dígitos y un único separador decimal (si se permiten decimales)
  private clean(raw: string, decimal: string): string {
    let result = '';
    let hasDecimal = false;
    for (const char of raw) {
      if (char >= '0' && char <= '9') result += char;
      else if (char === decimal && !hasDecimal && this.allowDecimals) {
        hasDecimal = true;
        result += char;
      } else if (char === '-' && result === '') result += char;
    }
    return result;
  }

  // Agrupa la parte entera y deja la decimal tal cual se escribió ("1500000,50" → "1.500.000,50")
  private formatRaw(cleaned: string): string {
    const { group, decimal } = this.separators();
    const sign = cleaned.startsWith('-') ? '-' : '';
    const [integer, fraction] = cleaned.slice(sign.length).split(decimal);
    const grouped = integer.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, group);
    return sign + grouped + (fraction !== undefined ? decimal + fraction : '');
  }

  private formatNumber(value: number | null): string {
    if (value === null) return '';
    const { decimal } = this.separators();
    return this.formatRaw(value.toString().replace('.', decimal));
  }

  // Ubica el cursor después del mismo número de caracteres significativos que antes de formatear
  private caretRange(formatted: string, significantCount: number, decimal: string): [number, number] {
    let seen = 0;
    let position = 0;
    while (position < formatted.length && seen < significantCount) {
      if (this.clean(formatted[position], decimal) !== '') seen++;
      position++;
    }
    return [position, position];
  }
}
