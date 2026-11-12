import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { useImportsStore } from '../../store';

// Módulo MyMoney (epic #213): un solo lugar para traer los movimientos de MyMoney.
// Cada paso del flujo mensual es una pestaña con su propia ruta (importar, categorías y, con #233, conciliación).
@Component({
  selector: 'app-mymoney',
  templateUrl: './mymoney.component.html',
  imports: [RouterModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyMoneyComponent {
  private importsStore = useImportsStore();

  protected steps = ['myMoney.stepExport', 'myMoney.stepUpload', 'myMoney.stepReview', 'myMoney.stepImport'];
  protected pendingCount = computed(() => this.importsStore.categoryMappings().filter(mapping => mapping.needsReview).length);

  constructor() {
    // Las pestañas comparten el estado: el mapeo se carga una vez y lo leído del archivo se mantiene
    // al cambiar de pestaña, pero no queda en memoria al salir del módulo
    this.importsStore.loadMappings();
    inject(DestroyRef).onDestroy(() => {
      this.importsStore.clearMyMoneyPreview();
      this.importsStore.clearCategorySync();
    });
  }
}
