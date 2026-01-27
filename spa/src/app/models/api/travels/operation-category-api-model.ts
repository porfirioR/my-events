export interface OperationCategoryApiModel {
  id: number;
  name: string;
  icon: string;
  color: string;
  isActive: boolean;
  dateCreated: Date;
}

export interface OperationCategorySummaryApiModel {
  category: OperationCategoryApiModel;
  operationCount: number;
  totalAmount: number;
  percentage: number;
}