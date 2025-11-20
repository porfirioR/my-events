import { ConfigurationBaseEntity } from ".";

export class SavingsProgressionTypeEntity extends ConfigurationBaseEntity {
  constructor(id: number, name: string, description: string) {
    super(id, name, description);
  }
}