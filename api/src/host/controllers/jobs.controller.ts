import { Controller, HttpCode, Inject, Post, Query, UseGuards } from '@nestjs/common';
import { Public } from '../decorators/public.decorator';
import { JobsSecretGuard } from '../guards/jobs-secret.guard';
import { JOBS_TOKENS } from '../../utility/constants/injection-tokens.const';
import { MonthlySummaryManagerService } from '../../manager/services/monthly-summary-manager.service';
import { MonthlySummaryRunModel } from '../../manager/models/jobs/monthly-summary-run.model';

// Tareas programadas (#263): sin JWT de usuario, protegidas por el secreto compartido con GitHub Actions
@Controller('jobs')
@Public()
@UseGuards(JobsSecretGuard)
export class JobsController {
  constructor(
    @Inject(JOBS_TOKENS.MONTHLY_SUMMARY_MANAGER_SERVICE)
    private readonly monthlySummaryManagerService: MonthlySummaryManagerService,
  ) {}

  // Resumen mensual por email. today ('YYYY-MM-DD') por defecto es hoy en Paraguay; dryRun=true arma
  // los emails sin enviarlos.
  @Post('monthly-summary')
  @HttpCode(200)
  async sendMonthlySummary(@Query('today') today?: string, @Query('dryRun') dryRun?: string): Promise<MonthlySummaryRunModel> {
    return this.monthlySummaryManagerService.sendAll(this.toToday(today), dryRun === 'true');
  }

  private toToday = (today?: string): string =>
    today && /^\d{4}-\d{2}-\d{2}$/.test(today)
      ? today
      : new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Asuncion' }).format(new Date());
}
