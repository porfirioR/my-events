import { CollaboratorMatchAccessModel, CreateMatchAccessRequest } from ".";

export interface ICollaboratorMatchAccessService {
  /**
   * Obtiene un match por ID de colaborador
   * @param collaboratorId - ID del colaborador a buscar
   * @returns Promise con el match encontrado o null si no existe
   */
  getMatchByCollaboratorId(collaboratorId: number): Promise<CollaboratorMatchAccessModel | null>;

  /**
   * Obtiene todos los matches de un usuario
   * @param userId - ID del usuario propietario
   * @returns Promise con lista de matches del usuario
   */
  getMatchesByUserId(userId: number): Promise<CollaboratorMatchAccessModel[]>;

  /**
   * Obtiene un match específico por ID
   * @param matchId - ID del match a buscar
   * @returns Promise con el match encontrado o null si no existe
   */
  getMatchById(matchId: number): Promise<CollaboratorMatchAccessModel | null>;

  /**
   * Crea un nuevo match entre dos colaboradores
   * @param request - Datos del match a crear
   * @returns Promise con el match creado
   * @throws Error si hay problemas en la creación
   */
  createMatch(request: CreateMatchAccessRequest): Promise<CollaboratorMatchAccessModel>;

  /**
   * Elimina un match existente
   * @param matchId - ID del match a eliminar
   * @returns Promise que se resuelve cuando se elimina
   * @throws Error si el match no existe o no se puede eliminar
   */
  deleteMatch(matchId: number): Promise<void>;

  /**
   * Verifica si existe un match entre dos colaboradores
   * @param collaborator1Id - ID del primer colaborador
   * @param collaborator2Id - ID del segundo colaborador
   * @returns Promise con true si existe el match, false si no existe
   */
  existsMatch(collaborator1Id: number, collaborator2Id: number): Promise<boolean>;
}