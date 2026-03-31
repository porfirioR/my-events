import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  isDarkMode = signal(false);

  constructor() {
    this.initializeTheme();

    // Effect para aplicar los estilos cuando cambia el signal
    effect(() => {
      const isDark = this.isDarkMode();
      const html = document.documentElement;

      // Aplicar clase dark para Tailwind
      if (isDark) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }

      // Aplicar data-theme para DaisyUI
      html.setAttribute('data-theme', isDark ? 'dark' : 'light');

      // Sincronizar meta theme-color (barra del navegador en móvil)
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', '#4338CA');
      }

    });
  }

  private initializeTheme() {
    // 1. Verificar si hay preferencia guardada en localStorage
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme === 'dark' || savedTheme === 'light') {
      // Si hay tema guardado, usarlo
      this.isDarkMode.set(savedTheme === 'dark');
    } else {
      // 2. Si no hay preferencia guardada, usar la del navegador
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.isDarkMode.set(darkModeQuery.matches);
      
      // Escuchar cambios en la preferencia del sistema (solo si no hay tema guardado)
      darkModeQuery.addEventListener('change', (e) => {
        // Solo aplicar cambios del sistema si el usuario no ha guardado una preferencia
        if (!localStorage.getItem('theme')) {
          this.isDarkMode.set(e.matches);
        }
      });
    }
  }

  setTheme(isDark: boolean) {
    this.isDarkMode.set(isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }

  toggleTheme() {
    const newValue = !this.isDarkMode();
    this.setTheme(newValue);
  }
}