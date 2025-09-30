import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PrivateEndpointGuard } from '../guards/private-endpoint.guard';
import { ConfigurationManagerService } from '../../manager/services';
import { Configurations } from '../../utility/enums';
import { TypeModel, PeriodModel, CurrencyModel } from '../../manager/models/configurations';

@Controller('configurations')
@UseGuards(PrivateEndpointGuard)
export class ConfigurationController {
  constructor(private configurationManagerService: ConfigurationManagerService) {}

  @Get(':configuration')
  async getTypes(@Param('configuration') configuration: Configurations): Promise<TypeModel[] | PeriodModel[] | CurrencyModel[]> {
    return await this.configurationManagerService.getConfiguration(configuration);
  }
}
