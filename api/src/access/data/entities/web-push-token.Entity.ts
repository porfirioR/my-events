export interface WebPushTokenEntity {
  id: number
  endpoint: string
  expirationtime: Date | null,
  keys: string
  email: string
}
