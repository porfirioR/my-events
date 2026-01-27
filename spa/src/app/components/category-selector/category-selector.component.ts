import { Component, computed, input, OnInit, output } from '@angular/core';
import { OperationCategoryApiModel } from '../../models/api/travels';
import { useTravelStore } from '../../store';

@Component({
  selector: 'app-category-selector',
  templateUrl: './category-selector.component.html',
  styleUrls: ['./category-selector.component.css']
})
export class CategorySelectorComponent implements OnInit {
  private travelStore = useTravelStore();

  // Inputs
  selectedCategoryId = input<number | undefined>();
  disabled = input(false);

  // Outputs
  categorySelected = output<OperationCategoryApiModel | undefined>();

  // Computed
  activeCategories = this.travelStore.activeCategories;
  selectedCategory = computed(() => 
    this.travelStore.getCategoryById()(this.selectedCategoryId())
  );

  ngOnInit() {
    // Load categories if needed
    if (this.travelStore.needsLoadingCategories()) {
      this.travelStore.loadCategories();
    }
  }

  selectCategory(category: OperationCategoryApiModel) {
    if (this.disabled()) return;

    if (this.isSelected(category)) {
      this.clearSelection();
    } else {
      this.categorySelected.emit(category);
    }
  }

  clearSelection() {
    if (this.disabled()) return;
    this.categorySelected.emit(undefined);
  }

  isSelected(category: OperationCategoryApiModel): boolean {
    return this.selectedCategoryId() === category.id;
  }

  getCategoryClasses(category: OperationCategoryApiModel): string {
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
