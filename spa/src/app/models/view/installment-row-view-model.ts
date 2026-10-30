// Fila normalizada de cuota para app-installments-table (préstamos y ahorros)
export class InstallmentRowViewModel {
  constructor(
    public id: number,
    public installmentNumber: number,
    public dueDate: string | Date | null,
    public amount: number,
    public statusId: number,
    public paidDate: string | Date | null,
    // Valores de las columnas extra, por key de InstallmentColumnViewModel
    public extra: Partial<Record<string, number>> = {},
  ) { }
}

// Columna extra (monto) que cada módulo agrega a la tabla: capital, interés, saldo, acumulado...
export class InstallmentColumnViewModel {
  constructor(
    public key: string,
    public label: string,
    public cssClass = '',
  ) { }
}
