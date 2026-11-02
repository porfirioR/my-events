// Qué tan rápido se puede usar la plata de un activo
export enum NetWorthLiquidity {
  Immediate = 1,  // cuentas, efectivo y metas que se retiran en cualquier momento
  Days = 2,       // se rescata en días (fondo mutuo: al día siguiente)
  Locked = 3,     // bloqueada hasta el vencimiento o el final de las cuotas
  Receivable = 4, // préstamos otorgados: plata que te deben
}
