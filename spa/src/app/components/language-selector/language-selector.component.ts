import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-language-selector',
  imports: [CommonModule],
  templateUrl: './language-selector.component.html',
  styleUrls: ['./language-selector.component.css']
})
export class LanguageSelectorComponent {
  private translationService = inject(TranslationService);

  public availableLanguages = this.translationService.availableLanguages;
  protected currentLanguage = this.translationService.getCurrentLanguageOption.bind(this.translationService);

  protected changeLanguage(lang: 'en' | 'es'): void {
    this.translationService.setLanguage(lang);
  }
}