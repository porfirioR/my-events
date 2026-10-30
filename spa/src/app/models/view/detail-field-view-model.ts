// Dato de la cabecera de un detalle (tarjeta de resumen o campo del bloque de información)
export class DetailFieldViewModel {
  constructor(
    public label: string,
    public value: string,
    public valueClass = '',
    // Clave de traducción que se agrega después del valor (ej. "meses")
    public valueSuffix = '',
    // Clave de traducción opcional debajo del valor (ej. "por mes")
    public description = '',
  ) { }
}
