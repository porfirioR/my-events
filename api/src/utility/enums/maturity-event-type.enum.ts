// Eventos del calendario de vencimientos
export enum MaturityEventType {
  SavingsMaturity = 1, // vence un ahorro (plazo fijo, CDA, ahorro programado, meta con fecha)
  RotatingPayout = 2,  // cobro estimado de una rueda
  LentCollection = 3,  // cuota a cobrar de un préstamo otorgado
  LoanEnd = 4,         // termina un préstamo que debo: se libera la cuota (no es plata que entra)
}
