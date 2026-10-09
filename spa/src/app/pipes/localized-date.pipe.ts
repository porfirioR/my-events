import { inject, Pipe, PipeTransform } from '@angular/core';
import { formatDate, registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { TranslateService } from '@ngx-translate/core';

registerLocaleData(localeEs, 'es');

// Idiomas de ngx-translate → locale de Angular (en-US viene incluido por defecto)
const LOCALE_MAP: Record<string, string> = {
  en: 'en-US',
  es: 'es',
};

/**
 * Igual que el pipe `date` de Angular, pero usa el idioma actual de la app.
 * Es impuro para re-formatear cuando cambia el idioma.
 */
@Pipe({
  name: 'localizedDate',
  standalone: true,
  pure: false,
})
export class LocalizedDatePipe implements PipeTransform {
  private readonly translate = inject(TranslateService);

  transform(value: Date | string | number | null | undefined, format = 'mediumDate', timezone?: string): string | null {
    if (value === null || value === undefined || value === '') return null;
    const lang = this.translate.getCurrentLang() || this.translate.getFallbackLang() || 'en';
    return formatDate(value, format, LOCALE_MAP[lang] ?? 'en-US', timezone);
  }
}
