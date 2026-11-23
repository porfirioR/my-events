// Resultado de una corrida del resumen mensual por email (#263). Solo ids: la respuesta no expone emails.
export type MonthlySummaryResultStatus = 'sent' | 'dryRun' | 'optedOut' | 'empty' | 'failed';

export class MonthlySummaryResultModel {
  constructor(
    public readonly userId: number,
    public readonly status: MonthlySummaryResultStatus,
  ) {}
}

export class MonthlySummaryRunModel {
  public readonly sent: number;
  public readonly skipped: number;
  public readonly failed: number;

  constructor(
    public readonly today: string,
    public readonly dryRun: boolean,
    public readonly results: MonthlySummaryResultModel[],
  ) {
    this.sent = results.filter(r => r.status === 'sent' || r.status === 'dryRun').length;
    this.skipped = results.filter(r => r.status === 'optedOut' || r.status === 'empty').length;
    this.failed = results.filter(r => r.status === 'failed').length;
  }
}
