import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { OperationCategoryApiModel } from '../../models/api/travels';
import { useTravelStore } from '../../store';

@Component({
  selector: 'app-category-selector',
  templateUrl: './category-selector.component.html',
  styleUrls: ['./category-selector.component.css'],
  imports: [CommonModule, TranslateModule]
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
  protected selectedCategory = computed(() => 
    this.travelStore.getCategoryById()(this.selectedCategoryId())
  );

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

  protected getCategoryClasses(category: OperationCategoryApiModel): string {
    const baseClasses = 'flex flex-col items-center gap-1 h-16';
    
    if (this.disabled()) {
      return `${baseClasses} btn-disabled opacity-50`;
    }
    
    if (this.isSelected(category)) {
      return `${baseClasses} border-opacity-100 shadow-md`;
    }
    
    return `${baseClasses} btn-outline hover:border-opacity-50`;
  }
}
