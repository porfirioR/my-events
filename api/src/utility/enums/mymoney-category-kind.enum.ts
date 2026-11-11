// Clasificación de una categoría de MyMoney (#231) para no contar dos veces:
// Transfer es plata que solo cambia de lugar (va a un ahorro, paga o cobra un préstamo).
export enum MyMoneyCategoryKind {
  Consumption = 1,
  Transfer = 2,
  Income = 3,
  Refund = 4,
}
