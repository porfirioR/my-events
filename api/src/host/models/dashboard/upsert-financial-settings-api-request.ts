// Sin ValidationPipe global: los valores pueden llegar como string; el manager los valida
export class UpsertFinancialSettingsApiRequest {
  monthlyNetIncome?: number | string | null;
  monthlyEssentialExpense?: number | string | null;
  cushionGreenMonths: number | string;
  cushionYellowMonths: number | string;
  savingsGreenPercentage: number | string;
  savingsYellowPercentage: number | string;
  debtGreenPercentage: number | string;
  debtYellowPercentage: number | string;
}
