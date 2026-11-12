import { MyMoneyIssue } from '../../../utility/helpers/mymoney-export.helper';
import { MyMoneyCategoryMappingModel } from './mymoney-category-mapping.model';

// Resultado de sincronizar las categorías desde un export de MyMoney (#231).
// valid = false → no se guardó nada y errors explica por qué; mappings trae lo que ya había.
export class MyMoneyCategorySyncModel {
  constructor(
    public readonly fileName: string,
    public readonly valid: boolean,
    public readonly errors: MyMoneyIssue[],
    public readonly created: number,
    public readonly renamed: number,
    public readonly mappings: MyMoneyCategoryMappingModel[],
  ) {}
}
