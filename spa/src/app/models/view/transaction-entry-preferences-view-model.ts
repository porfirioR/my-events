import { TransactionEntryModeType } from '../../constants'

export class TransactionEntryPreferencesViewModel {
  constructor(
    public mode: TransactionEntryModeType,
    public collaboratorId: number | null
  ) { }
}
