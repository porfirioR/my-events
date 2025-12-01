import { ConfigurationBaseAccessModel } from '.';

export class SavingsStatusAccessModel extends ConfigurationBaseAccessModel {
  constructor(id: number, name: string, description: string) {
    super(id, name, description);
  }
}
