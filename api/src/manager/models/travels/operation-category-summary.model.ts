export class OperationCategorySummaryModel {
  constructor(
    public category: OperationCategoryModel,
    public operationCount: number,
    public totalAmount: number,
    public percentage: number, // % of total travel spending
  ) {}
}