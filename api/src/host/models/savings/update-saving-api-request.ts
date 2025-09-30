import { CreateSavingApiRequest } from "./create-saving-api-request"

export type UpdateSavingApiRequest = CreateSavingApiRequest & {
  id: number
  isActive: boolean
}
