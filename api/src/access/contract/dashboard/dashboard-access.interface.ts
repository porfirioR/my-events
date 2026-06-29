import { DashboardAccessModel } from './dashboard-access.model';

export interface IDashboardAccessService {
  getSummary(userId: number): Promise<DashboardAccessModel>;
}
