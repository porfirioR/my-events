import { ConfigurationBaseEntity } from './configuration-base.entity';

export class SavingsStatusEntity extends ConfigurationBaseEntity {
  constructor(id: number, name: string, description: string) {
    super(id, name, description);
  }
}
