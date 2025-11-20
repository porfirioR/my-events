import { ConfigurationBaseModel } from '.';

export class InstallmentStatusModel extends ConfigurationBaseModel {
  constructor(id: number, name: string, description: string) {
    super(id, name, description);
  }
}
