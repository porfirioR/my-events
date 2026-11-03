import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

export type Language = 'en' | 'es';

export interface LanguageOption {
  code: Language;
  name: string;
  flag: string;
  flagSvg: string;
}

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private translate = inject(TranslateService);
  private router = inject(Router);
  
  private readonly STORAGE_KEY = 'app-language';
  
  // ✅ Idiomas disponibles con rutas SVG
  readonly availableLanguages: LanguageOption[] = [
    { 
      code: 'en', 
      name: 'English', 
      flag: '🇺🇸',
      flagSvg: './assets/img/en.svg'
    },
    { 
      code: 'es', 
      name: 'Español', 
      flag: '🇪🇸',
      flagSvg: './assets/img/es.svg'
    }
  ];

  /**
   * Inicializa el idioma desde localStorage o usa el idioma del navegador.
   * Se llama al arrancar la app (app.config) y espera a que cargue el JSON,
   * así ninguna pantalla se arma con el idioma de respaldo (inglés)
   */
  init(): Observable<unknown> {
    const savedLanguage = this.getSavedLanguage();
    const browserLanguage = this.getBrowserLanguage();
    const defaultLanguage: Language = savedLanguage || browserLanguage || 'en';

    return this.applyLanguage(defaultLanguage);
  }

  /**
   * Obtiene el idioma guardado en localStorage
   */
  private getSavedLanguage(): Language | null {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    return this.isValidLanguage(saved) ? (saved as Language) : null;
  }

  /**
   * Obtiene el idioma del navegador
   */
  private getBrowserLanguage(): Language | null {
    const browserLang = this.translate.getBrowserLang();
    return this.isValidLanguage(browserLang) ? (browserLang as Language) : null;
  }

  /**
   * Verifica si un idioma es válido
   */
  private isValidLanguage(lang: string | undefined | null): boolean {
    return !!lang && this.availableLanguages.some(l => l.code === lang);
  }

  /**
   * Cambia el idioma de la aplicación
   */
  setLanguage(lang: Language): void {
    this.applyLanguage(lang);
    this.refreshPageTitle();
  }

  private applyLanguage(lang: Language): Observable<unknown> {
    localStorage.setItem(this.STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    return this.translate.use(lang);
  }

  /**
   * Obtiene el idioma actual
   */
  getCurrentLanguage(): Language {
    return this.translate.currentLang as Language;
  }

  /**
   * Obtiene la configuración del idioma actual
   */
  getCurrentLanguageOption(): LanguageOption {
    const currentLang = this.getCurrentLanguage();
    return this.availableLanguages.find(l => l.code === currentLang) || this.availableLanguages[0];
  }

  /**
   * Traduce una clave instantáneamente
   */
  instant(key: string, params?: any): string {
    return this.translate.instant(key, params);
  }

  /**
   * Traduce una clave de forma asíncrona
   */
  get(key: string, params?: any) {
    return this.translate.get(key, params);
  }

  /**
   * Cambia al siguiente idioma disponible
   */
  toggleLanguage(): void {
    const currentIndex = this.availableLanguages.findIndex(
      l => l.code === this.getCurrentLanguage()
    );
    const nextIndex = (currentIndex + 1) % this.availableLanguages.length;
    this.setLanguage(this.availableLanguages[nextIndex].code);
  }

  /**
   * ✅ NUEVO: Refresca el título de la página navegando a la misma ruta
   * Esto fuerza la actualización del título traducido
   */
  private refreshPageTitle(): void {
    const currentUrl = this.router.url;
    
    // Solo refrescar si no estamos en una ruta de autenticación sin guard
    // para evitar navegación innecesaria en login/signup
    if (currentUrl === '/' || currentUrl === '') {
      return;
    }
    
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigateByUrl(currentUrl);
    });
  }
}