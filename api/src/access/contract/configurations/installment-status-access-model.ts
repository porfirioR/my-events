import { ConfigurationBaseAccessModel } from '.';

export class InstallmentStatusAccessModel extends ConfigurationBaseAccessModel {
  constructor(id: number, name: string, description: string) {
    super(id, name, description);
  }
}
