import { CollaboratorAccessModel, CreateCollaboratorAccessRequest, UpdateCollaboratorAccessRequest } from 'src/access/contract/collaborators';

export interface ICollaboratorAccessService {
/**
 * Obtiene todos los colaboradores activos de un usuario
 * @param createdByUserId - ID del usuario propietario
 * @returns Promise con lista de colaboradores activos
 */
getMyCollaborators(createdByUserId: number): Promise<CollaboratorAccessModel[]>;

/**
 * Obtiene colaboradores internos (sin email) de un usuario
 * @param createdByUserId - ID del usuario propietario
 * @returns Promise con lista de colaboradores internos
 */
getInternalCollaborators(createdByUserId: number): Promise<CollaboratorAccessModel[]>;

/**
 * Obtiene colaboradores externos (con email) de un usuario
 * @param createdByUserId - ID del usuario propietario
 * @returns Promise con lista de colaboradores externos
 */
getExternalCollaborators(createdByUserId: number): Promise<CollaboratorAccessModel[]>;

/**
 * Obtiene un colaborador específico por ID
 * @param id - ID del colaborador
 * @param createdByUserId - ID del usuario propietario
 * @returns Promise con el colaborador encontrado
 * @throws Error si el colaborador no existe o no pertenece al usuario
 */
getCollaboratorById(id: number,createdByUserId: number): Promise<CollaboratorAccessModel>;

/**
 * Crea un nuevo colaborador
 * @param accessRequest - Datos del colaborador a crear
 * @returns Promise con el colaborador creado
 * @throws Error si hay problemas en la creación
 */
createCollaborator(accessRequest: CreateCollaboratorAccessRequest): Promise<CollaboratorAccessModel>;

/**
 * Actualiza un colaborador existente
 * @param accessRequest - Datos actualizados del colaborador
 * @returns Promise con el colaborador actualizado
 * @throws Error si el colaborador no existe o no se puede actualizar
 */
updateCollaborator(accessRequest: UpdateCollaboratorAccessRequest): Promise<CollaboratorAccessModel>;

/**
 * Desactiva un colaborador (soft delete)
 * @param id - ID del colaborador a desactivar
 * @param createdByUserId - ID del usuario propietario
 * @returns Promise con el colaborador desactivado
 * @throws Error si el colaborador no existe o no pertenece al usuario
 */
deactivateCollaborator(id: number,createdByUserId: number): Promise<CollaboratorAccessModel>;

/**
 * Verifica si un colaborador puede ser eliminado
 * @param collaboratorId - ID del colaborador a verificar
 * @returns Promise con true si se puede eliminar, false si está en uso
 */
canDeleteCollaborator(collaboratorId: number): Promise<boolean>;

/**
 * Obtiene estadísticas de colaboradores de un usuario
 * @param createdByUserId - ID del usuario propietario
 * @returns Promise con estadísticas (total, internos, externos)
 */
getCollaboratorStats(createdByUserId: number): Promise<{ total: number; internal: number; external: number; }>;}
