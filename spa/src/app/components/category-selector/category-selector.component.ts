import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { OperationCategoryApiModel } from '../../models/api/travels';
import { useTravelStore } from '../../store';

@Component({
  selector: 'app-category-selector',
  templateUrl: './category-selector.component.html',
  styleUrls: ['./category-selector.component.css'],
  imports: [CommonModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategorySelectorComponent {
  private travelStore = useTravelStore();

  // Inputs
  selectedCategoryId = input<number | undefined>();
  disabled = input(false);
  required = input(true);
  label = input('operations.category');

  // Outputs
  categorySelected = output<OperationCategoryApiModel | undefined>();

  // Computed
  protected activeCategories = this.travelStore.activeCategories;

  protected selectCategory(category: OperationCategoryApiModel): void {
    if (this.disabled()) return;
    
    if (this.isSelected(category)) {
      this.clearSelection();
    } else {
      this.categorySelected.emit(category);
    }
  }

  protected clearSelection(): void {
    if (this.disabled()) return;
    this.categorySelected.emit(undefined);
  }

  protected isSelected(category: OperationCategoryApiModel): boolean {
    return this.selectedCategoryId() === category.id;
  }
}
