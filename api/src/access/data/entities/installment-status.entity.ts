import { ConfigurationBaseEntity } from './configuration-base.entity';

export class InstallmentStatusEntity extends ConfigurationBaseEntity {
  constructor(id: number, name: string, description: string) {
    super(id, name, description);
  }
}
