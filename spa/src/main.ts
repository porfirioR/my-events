import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Función para aplicar el tema ANTES de que Angular cargue
function initializeTheme() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Determinar si debe ser dark mode
  const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

  const html = document.documentElement;

  if (isDark) {
    // Aplicar clase dark para Tailwind
    html.classList.add('dark');
    // Aplicar data-theme para DaisyUI
    html.setAttribute('data-theme', 'dark');
    console.log('Initial theme applied: dark');
  } else {
    html.classList.remove('dark');
    html.setAttribute('data-theme', 'light');
    console.log('Initial theme applied: light');
  }
}

// Ejecutar ANTES del bootstrap
initializeTheme();

bootstrapApplication(AppComponent, appConfig).catch((err) =>
  console.error(err)
);
