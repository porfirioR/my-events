// Movimiento normalizado para app-movements-list: pagos/cobros de préstamos, depósitos y retiros de ahorros
export class MovementViewModel {
  constructor(
    public id: number,
    public amount: number,
    public date: string | Date,
    public description: string | null,
    // true = sale dinero (retiro de fondo mutuo); se muestra con "-" y en warning
    public isOutflow: boolean,
    public installmentNumber: number | null,
  ) { }
}
