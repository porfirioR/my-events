import { inject, Pipe, PipeTransform } from '@angular/core';
import { formatDate, registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { TranslateService } from '@ngx-translate/core';
import { LanguageLocales } from '../constants';

registerLocaleData(localeEs, 'es');

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
    return formatDate(value, format, LanguageLocales[lang] ?? 'en-US', timezone);
  }
}
