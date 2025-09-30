export interface CreateSavingApiRequest {
  name: string
  description: string
  date: Date
  savingTypeId: number
  currencyId: number
  userId: number
  periodId?: number
  totalAmount?: number
  numberOfPayment?: number
  customPeriodQuantity?: number
}
