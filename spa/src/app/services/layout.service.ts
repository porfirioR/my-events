import { Injectable, signal } from '@angular/core';

const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed';
const DESKTOP_QUERY = '(min-width: 1024px)';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  // Escritorio: barra fija que se puede colapsar a solo íconos (se recuerda en localStorage)
  isSidebarCollapsed = signal(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true');
  // Móvil: cajón que se abre con el burger y se cierra al navegar
  isMobileSidebarOpen = signal(false);

  toggleSidebar(): void {
    if (window.matchMedia(DESKTOP_QUERY).matches) {
      const collapsed = !this.isSidebarCollapsed();
      this.isSidebarCollapsed.set(collapsed);
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    } else {
      this.isMobileSidebarOpen.update(open => !open);
    }
  }

  closeMobileSidebar(): void {
    this.isMobileSidebarOpen.set(false);
  }
}
