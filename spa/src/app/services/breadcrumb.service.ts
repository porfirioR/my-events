import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BreadcrumbService {
  // Nombre a mostrar para un segmento con id, por URL (ej. '/loans/15' → 'Préstamo Natalia')
  labels = signal<Record<string, string>>({});

  setLabel(url: string, label: string): void {
    if (this.labels()[url] === label) return;
    this.labels.update(labels => ({ ...labels, [url]: label }));
  }
}
