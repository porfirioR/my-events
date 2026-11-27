export interface ResendVerificationEmailApiRequest {
  email: string;
  // Idioma del selector del SPA para el email ('es' | 'en')
  language?: string;
}