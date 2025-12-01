import { ConfigurationBaseModel } from '.';

export class SavingsStatusModel extends ConfigurationBaseModel {
  constructor(id: number, name: string, description: string) {
    super(id, name, description);
  }
}
