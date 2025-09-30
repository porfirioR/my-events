export interface SavingApiModel {
  id: number
  isActive: boolean
  name: string
  description: string
  date: Date
  savingTypeId: number
  currencyId: number
  userId: number
  periodId?: number
  totalAmount?: number
  numberOfPayment?: number
}
