import { ConfigurationBaseModel } from '.';

export class SavingsProgressionTypeModel extends ConfigurationBaseModel {
  constructor(id: number, name: string, description: string) {
    super(id, name, description);
  }
}
