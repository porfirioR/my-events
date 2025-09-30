export enum MatchRequestStatus {
  Pending = 'Pending',                // Solicitud enviada, esperando respuesta
  Accepted = 'Accepted',              // Aceptada y match creado
  Rejected = 'Rejected',              // Rechazada por el usuario
  EmailNotFound = 'EmailNotFound',  // Email no existe en el sistema (nuevo)
  Expired = 'Expired'                 // Solicitud expirada sin respuesta
}