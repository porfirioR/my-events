import { SavingsProgrammedTermAccessModel } from './savings-programmed-term-access.model';

export interface ISavingsProgrammedTermAccessService {
  getAll(): Promise<SavingsProgrammedTermAccessModel[]>;
}
