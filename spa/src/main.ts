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

// Pantalla de inicio (index.html): se muestra al menos SPLASH_MIN_MS desde que se abrió la página
// y se desvanece cuando Angular ya arrancó, así no parpadea cuando la app carga rápido
const SPLASH_MIN_MS = 1200;

function hideSplash() {
  const splash = document.getElementById('app-splash');
  if (!splash) return;
  const wait = Math.max(0, SPLASH_MIN_MS - performance.now());
  setTimeout(() => {
    splash.classList.add('app-splash-hide');
    // Por si no hay transición (ej. pestaña en segundo plano), se quita igual
    setTimeout(() => splash.remove(), 400);
  }, wait);
}

bootstrapApplication(AppComponent, appConfig)
  .then(hideSplash)
  .catch((err) => {
    hideSplash();
    console.error(err);
  });
