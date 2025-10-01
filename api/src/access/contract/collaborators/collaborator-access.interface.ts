import { CollaboratorAccessModel, CreateCollaboratorAccessRequest, UpdateCollaboratorAccessRequest } from 'src/access/contract/collaborators';

export interface ICollaboratorAccessService {
/**
 * Obtiene todos los colaboradores activos de un usuario
 * @param userId - ID del usuario propietario
 * @returns Promise con lista de colaboradores activos
 */
getAll(userId: number): Promise<CollaboratorAccessModel[]>;

/**
 * Obtiene colaboradores internos (sin email) de un usuario
 * @param userId - ID del usuario propietario
 * @returns Promise con lista de colaboradores internos
 */
getInternalCollaborators(userId: number): Promise<CollaboratorAccessModel[]>;

/**
 * Obtiene colaboradores externos (con email) de un usuario
 * @param userId - ID del usuario propietario
 * @returns Promise con lista de colaboradores externos
 */
getExternalCollaborators(userId: number): Promise<CollaboratorAccessModel[]>;

/**
 * Obtiene un colaborador específico por ID
 * @param id - ID del colaborador
 * @param userId - ID del usuario propietario
 * @returns Promise con el colaborador encontrado
 * @throws Error si el colaborador no existe o no pertenece al usuario
 */
getById(id: number,userId: number): Promise<CollaboratorAccessModel>;

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
 * Desactiva o reactiva un colaborador (soft delete)
 * @param id - ID del colaborador a (des)activar
 * @param userId - ID del usuario propietario
 * @returns Promise con el colaborador (des)activado
 * @throws Error si el colaborador no existe o no pertenece al usuario
 */
changeVisibility(id: number,userId: number): Promise<CollaboratorAccessModel>;

/**
 * Verifica si un colaborador puede ser eliminado
 * @param collaboratorId - ID del colaborador a verificar
 * @returns Promise con true si se puede eliminar, false si está en uso
 */
canDeleteCollaborator(collaboratorId: number): Promise<boolean>;

/**
 * Obtiene estadísticas de colaboradores de un usuario
 * @param userId - ID del usuario propietario
 * @returns Promise con estadísticas (total, internos, externos)
 */
getCollaboratorStats(userId: number): Promise<{ total: number; internal: number; external: number; }>;

/**
 * Obtiene un colaborador por email
 * @param email - Email del colaborador a buscar
 * @returns Promise con el colaborador encontrado o null si no existe
 */
getByEmail(email: string): Promise<CollaboratorAccessModel | null>;

/**
 * Obtiene un colaborador  external por email
 * @param email - Email del colaborador a buscar
 * @returns Promise con el colaborador encontrado o null si no existe
 */
getExternalCollaboratorsByEmail(email: string): Promise<CollaboratorAccessModel[]>;
}
