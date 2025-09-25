import { CollaboratorType } from "../../../constants"

export interface CollaboratorApiModel {
  id: number
  name: string
  surname: string
  email: string | null
  userId: number
  isActive: boolean
  createdDate: Date
  type: CollaboratorType
}
