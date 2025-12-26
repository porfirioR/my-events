import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class AppTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly translate = inject(TranslateService);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const title = this.buildTitle(snapshot);
    if (title) {
      // Intentar traducir el título
      this.translate.get(`routes.${title}`).subscribe((translatedTitle: string) => {
        // Si la traducción existe (no es igual a la key), usar traducción
        // Si no existe, usar el título original
        const finalTitle = translatedTitle !== `routes.${title}` 
          ? translatedTitle 
          : title;
        this.title.setTitle(`${finalTitle} - Mis Eventos`);
      });
    } else {
      this.title.setTitle('Mis Eventos');
    }
  }
}