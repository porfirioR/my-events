export enum MatchRequestStatus {
  Pending = 'Pending',                // Solicitud enviada, esperando respuesta
  Accepted = 'Accepted',              // Aceptada y match creado
  EmailNotFound = 'EmailNotFound',  // Email no existe en el sistema (nuevo)
}