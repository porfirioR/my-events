export interface ForgotPasswordApiRequest {
  email: string
  // Idioma del selector del SPA para el email ('es' | 'en')
  language?: string
}
