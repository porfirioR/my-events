import { CollaboratorMatchRequestAccessModel, CreateMatchRequestAccessRequest } from ".";
import { MatchRequestStatus } from "../../../utility/enums";

export interface ICollaboratorMatchRequestAccessService {
  /**
   * Obtiene las solicitudes de match recibidas por un usuario
   * @param userId - ID del usuario que recibe las solicitudes
   * @param status - (Opcional) Filtrar por estado de la solicitud
   * @returns Promise con lista de solicitudes recibidas
   */
  getReceivedRequests(userId: number, status?: MatchRequestStatus): Promise<CollaboratorMatchRequestAccessModel[]>;

  /**
   * Obtiene las solicitudes de match enviadas por un usuario
   * @param userId - ID del usuario que envió las solicitudes
   * @param status - (Opcional) Filtrar por estado de la solicitud
   * @returns Promise con lista de solicitudes enviadas
   */
  getSentRequests(userId: number, status?: MatchRequestStatus): Promise<CollaboratorMatchRequestAccessModel[]>;

  /**
   * Obtiene las solicitudes de match de un colaborador específico
   * @param collaboratorId - ID del colaborador
   * @param status - (Opcional) Filtrar por estado de la solicitud
   * @returns Promise con lista de solicitudes del colaborador
   */
  getRequestsByCollaborator(collaboratorId: number, status?: MatchRequestStatus): Promise<CollaboratorMatchRequestAccessModel[]>;

  /**
   * Obtiene una solicitud específica por ID
   * @param requestId - ID de la solicitud
   * @param userId - ID del usuario (debe ser requester o target)
   * @returns Promise con la solicitud encontrada o null si no existe
   * @throws Error si el usuario no tiene acceso a la solicitud
   */
  getById(requestId: number, userId: number): Promise<CollaboratorMatchRequestAccessModel | null>;

  /**
   * Crea una nueva solicitud de match
   * @param request - Datos de la solicitud a crear
   * @returns Promise con la solicitud creada
   * @throws Error si hay problemas en la creación
   */
  createRequest(request: CreateMatchRequestAccessRequest): Promise<CollaboratorMatchRequestAccessModel>;

  /**
   * Actualiza el estado de una solicitud
   * @param requestId - ID de la solicitud
   * @param status - Nuevo estado de la solicitud
   * @param userId - (Opcional) ID del usuario para validar permisos
   * @returns Promise con la solicitud actualizada
   * @throws Error si la solicitud no existe o el usuario no tiene permisos
   */
  updateStatus(requestId: number, status: MatchRequestStatus, userId?: number): Promise<CollaboratorMatchRequestAccessModel>;

  /**
   * Actualiza el usuario objetivo de una solicitud
   * Se usa cuando un email que no existía se registra en el sistema
   * @param requestId - ID de la solicitud
   * @param targetUserId - ID del nuevo usuario objetivo
   * @returns Promise con la solicitud actualizada
   * @throws Error si la solicitud no existe
   */
  updateTargetUser(requestId: number, targetUserId: number): Promise<CollaboratorMatchRequestAccessModel>;

  /**
   * Verifica si existe una solicitud pendiente entre un colaborador y un email
   * @param collaboratorId - ID del colaborador solicitante
   * @param targetEmail - Email del colaborador objetivo
   * @returns Promise con true si existe solicitud pendiente, false si no existe
   */
  existsPendingRequest(collaboratorId: number, targetEmail: string): Promise<boolean>;

  /**
   * Obtiene solicitudes por email objetivo
   * @param email - Email del colaborador objetivo
   * @param status - (Opcional) Filtrar por estado de la solicitud
   * @returns Promise con lista de solicitudes para ese email
   */
  getRequestsByEmail(email: string, status?: MatchRequestStatus): Promise<CollaboratorMatchRequestAccessModel[]>;

  /**
   * Elimina una solicitud de match
   * @param requestId - ID de la solicitud a eliminar
   * @param userId - ID del usuario solicitante
   * @returns Promise que se resuelve cuando se elimina
   * @throws Error si la solicitud no existe o el usuario no es el solicitante
   */
  deleteRequest(requestId: number, userId: number): Promise<void>;

  hasEverSentRequest(collaboratorId: number, targetEmail: string): Promise<boolean>
  hasReceivedPendingInvitation(targetEmail: string, myUserId: number): Promise<boolean>
}