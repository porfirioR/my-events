import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component } from '@angular/core'

@Component({
  selector: 'app-dynamic-table',
  templateUrl: './dynamic-table.component.html',
  styleUrls: ['./dynamic-table.component.css'],
  imports: [
    CommonModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DynamicTableComponent {
  protected columnName: any[] = [
    'id',
    'nombre',
    'tipo',
    'ingredientes',
    'calorias',
    'precio',
    'descuento',
    'disponible',
    'fecha_creacion',
    'chef'
  ]
  protected matrix: any[][] = [
    [
      1,
      'Hamburguesa',
      'Fast Food',
      'carne de res',
      550,
      8.99,
      null,
      true,
      '2024-01-26',
      'Chef Juan'
    ],
    [
    2,
    'Ensalada César',
    'Ensalada',
    'pollo a la parrilla',
    350,
    7.99,
    0.5,
    true,
    '2024-01-26',
    'Chef Maria']
  ]

  protected objectList: any[] = [
    {
      'id': 1,
      'nombre': 'Hamburguesa',
      'tipo': 'Fast Food',
      'ingredientes': ['carne de res', 'queso', 'lechuga', 'tomate', 'pan'],
      'calorias': 550,
      'precio': 8.99,
      'descuento': null,
      'disponible': true,
      'fecha_creacion': '2024-01-26',
      'chef': 'Chef Juan'
    },
    {
      'id': 2,
      'nombre': 'Ensalada César',
      'tipo': 'Ensalada',
      'ingredientes': ['pollo a la parrilla', 'lechuga romana', 'queso parmesano', 'crutones', 'aderezo César'],
      'calorias': 350,
      'precio': 7.99,
      'descuento': 0.5,
      'disponible': true,
      'fecha_creacion': '2024-01-26',
      'chef': 'Chef Maria'
    },
    {
      'id': 3,
      'nombre': 'Pizza Margarita',
      'tipo': 'Pizza',
      'ingredientes': ['salsa de tomate', 'mozzarella', 'albahaca fresca', 'aceite de oliva', 'masa'],
      'calorias': 450,
      'precio': 10.99,
      'descuento': null,
      'disponible': true,
      'fecha_creacion': '2024-01-26',
      'chef': 'Chef Roberto'
    },
    {
      'id': 4,
      'nombre': 'Sushi Variado',
      'tipo': 'Sushi',
      'ingredientes': ['salmón', 'atún', 'aguacate', 'arroz', 'alga nori'],
      'calorias': 400,
      'precio': 14.99,
      'descuento': 1.0,
      'disponible': true,
      'fecha_creacion': '2024-01-26',
      'chef': 'Chef Aiko'
    },
    {
      'id': 5,
      'nombre': 'Pasta Alfredo',
      'tipo': 'Pasta',
      'ingredientes': ['fettuccine', 'salsa Alfredo', 'pollo', 'queso parmesano', 'pimienta'],
      'calorias': 600,
      'precio': 11.99,
      'descuento': null,
      'disponible': true,
      'fecha_creacion': '2024-01-26',
      'chef': 'Chef Giovanni'
    },
    {
      'id': 6,
      'nombre': 'Tacos de Carnitas',
      'tipo': 'Tacos',
      'ingredientes': ['carnitas de cerdo', 'cebolla', 'cilantro', 'salsa verde', 'tortillas de maíz'],
      'calorias': 450,
      'precio': 9.99,
      'descuento': 0.8,
      'disponible': true,
      'fecha_creacion': '2024-01-26',
      'chef': 'Chef Carmen'
    },
    {
      'id': 7,
      'nombre': 'Postre de Chocolate',
      'tipo': 'Postre',
      'ingredientes': ['brownie de chocolate', 'helado de vainilla', 'salsa de chocolate', 'nueces'],
      'calorias': 800,
      'precio': 6.99,
      'descuento': null,
      'disponible': true,
      'fecha_creacion': '2024-01-26',
      'chef': 'Chef Sofia'
    },
    {
      'id': 8,
      'nombre': 'Ramen de Mariscos',
      'tipo': 'Ramen',
      'ingredientes': ['caldo de mariscos', 'fideos de ramen', 'camarones', 'mejillones', 'alga nori'],
      'calorias': 500,
      'precio': 12.99,
      'descuento': 1.5,
      'disponible': true,
      'fecha_creacion': '2024-01-26',
      'chef': 'Chef Takashi'
    },
    {
      'id': 9,
      'nombre': 'Burrito de Pollo',
      'tipo': 'Burrito',
      'ingredientes': ['pollo a la parrilla', 'arroz', 'frijoles negros', 'salsa de tomate', 'tortilla de harina'],
      'calorias': 550,
      'precio': 8.49,
      'descuento': null,
      'disponible': true,
      'fecha_creacion': '2024-01-26',
      'chef': 'Chef Miguel'
    },
    {
      'id': 10,
      'nombre': 'Ceviche de Camarones',
      'tipo': 'Ceviche',
      'ingredientes': ['camarones frescos', 'limón', 'cebolla morada', 'cilantro', 'aguacate'],
      'calorias': 300,
      'precio': 13.99,
      'descuento': 0.7,
      'disponible': true,
      'fecha_creacion': '2024-01-26',
      'chef': 'Chef Isabella'
    }
  ]

  constructor() { }

}
