import { BaseConfigurationApiModel } from ".."
import { Configurations } from "../../enums"

export interface PeriodApiModel extends BaseConfigurationApiModel {
  configurationType: Configurations.Periods
  quantity: string
}