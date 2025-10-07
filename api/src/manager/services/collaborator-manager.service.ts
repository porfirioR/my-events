import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CollaboratorInvitationModel, CollaboratorMatchModel, CollaboratorModel, CollaboratorSummaryModel, CreateCollaboratorRequest, CreateMatchRequestRequest, EnrichedCollaboratorModel, MatchRequestResponseModel, ReceivedMatchRequestModel, UpdateCollaboratorRequest } from '../models/collaborators';
import { CollaboratorAccessModel, CreateCollaboratorAccessRequest, ICollaboratorAccessService, UpdateCollaboratorAccessRequest } from '../../access/contract/collaborators';
import { COLLABORATOR_TOKENS } from '../../utility/constants';
import { CollaboratorMatchAccessModel, CreateMatchAccessRequest, ICollaboratorMatchAccessService } from '../../access/contract/collaborator-match';
import { CollaboratorMatchRequestAccessModel, CreateMatchRequestAccessRequest, ICollaboratorMatchRequestAccessService } from '../../access/contract/collaborator-match-requests';
import { MatchRequestStatus } from '../../utility/enums';
import { CollaboratorMatchRequestModel } from '../models/collaborators/collaborator-match-request.model';
import { UserAccessService } from '../../access/data/services';


@Injectable()
export class CollaboratorManagerService {
  constructor(
    @Inject(COLLABORATOR_TOKENS.ACCESS_SERVICE)
    private collaboratorAccessService: ICollaboratorAccessService,
    
    @Inject(COLLABORATOR_TOKENS.MATCH_ACCESS_SERVICE)
    private matchAccessService: ICollaboratorMatchAccessService,
    
    @Inject(COLLABORATOR_TOKENS.MATCH_REQUEST_ACCESS_SERVICE)
    private matchRequestAccessService: ICollaboratorMatchRequestAccessService,
    private userAccessService: UserAccessService,
  ) {}

  // Obtener todos los colaboradores del usuario
  public getAll = async (userId: number): Promise<CollaboratorModel[]> => {
    const accessModelList = await this.collaboratorAccessService.getAll(userId);
    return accessModelList.map(this.getModel);
  };

  // Obtener colaboradores internos
  public getUnlinkedCollaborators = async (userId: number): Promise<CollaboratorModel[]> => {
    const accessModelList = await this.collaboratorAccessService.getUnlinkedCollaborators(userId);
    return accessModelList.map(this.getModel);
  };

  // Obtener colaboradores linkeados
  public getLinkedCollaborators = async (userId: number): Promise<CollaboratorModel[]> => {
    const accessModelList = await this.collaboratorAccessService.getLinkedCollaborators(userId);
    return accessModelList.map(this.getModel);
  };

  // Obtener un colaborador específico
  public getById = async (id: number, userId: number): Promise<CollaboratorModel> => {
    const accessModel = await this.collaboratorAccessService.getById(id, userId);
    return this.getModel(accessModel);
  };

  // Crear colaborador
  public createCollaborator = async (request: CreateCollaboratorRequest): Promise<CollaboratorModel> => {
    const accessRequest = new CreateCollaboratorAccessRequest(
      request.name,
      request.surname,
      request.userId
    );

    const accessModel = await this.collaboratorAccessService.createCollaborator(accessRequest);
    return this.getModel(accessModel);
  };

  // Actualizar colaborador
  public updateCollaborator = async (request: UpdateCollaboratorRequest): Promise<CollaboratorModel> => {
    const accessRequest = new UpdateCollaboratorAccessRequest(
      request.id,
      request.name,
      request.surname,
      request.userId
    );

    const accessModel = await this.collaboratorAccessService.updateCollaborator(accessRequest);
    return this.getModel(accessModel);
  };

  // Desactivar/Activar colaborador
  public changeVisibility = async (id: number, userId: number): Promise<CollaboratorModel> => {
    const accessModel = await this.collaboratorAccessService.changeVisibility(id, userId);
    return this.getModel(accessModel);
  };

  // Verificar si se puede eliminar
  public canDeleteCollaborator = async (collaboratorId: number): Promise<{ canDelete: boolean; reason?: string }> => {
    const canDelete = await this.collaboratorAccessService.canDeleteCollaborator(collaboratorId);
    return {
      canDelete,
      reason: canDelete ? undefined : 'El colaborador está asociado a transacciones existentes y no puede ser eliminado. Puede desactivarlo en su lugar.'
    };
  };

  // Obtener estadísticas
  public getCollaboratorStats = async (userId: number) => {
    return await this.collaboratorAccessService.getCollaboratorStats(userId);
  };

  // ==================== MATCH REQUESTS ====================

  /**
   * Crear solicitud de matching entre colaboradores externos
   * VALIDACIÓN BIDIRECCIONAL: No permite crear si ya existe una solicitud en cualquier dirección
   */
  public createMatchRequest = async (userId: number, request: CreateMatchRequestRequest): Promise<MatchRequestResponseModel> => {
    // 1. Validar que el colaborador pertenece al usuario
    const collaborator = await this.collaboratorAccessService.getById(request.collaboratorId, userId);
    if (!collaborator) {
      throw new NotFoundException('Collaborator not found');
    }

    // 2. Validar que es colaborador INTERNO (sin email)
    if (collaborator.email) {
      throw new BadRequestException('This collaborator is already linked. Only unlinked collaborators can request matches.');
    }

    // 3. ⭐ VALIDAR QUE EL EMAIL NO ESTÉ ASIGNADO A OTRO COLABORADOR MÍO
    const myCollaboratorWithEmail = await this.collaboratorAccessService.getMyCollaboratorByEmail(
      request.targetEmail,
      userId
    );

    if (myCollaboratorWithEmail) {
      throw new BadRequestException('This email is already assigned to another one of your collaborators');
    }

    // 4. ⭐ VALIDAR QUE NO HAYA INVITADO ANTES (INCLUSO SI FUE ACEPTADA/RECHAZADA)
    const existingRequest = await this.matchRequestAccessService.hasEverSentRequest(
      request.collaboratorId,
      request.targetEmail
    );

    if (existingRequest) {
      throw new BadRequestException(
        'You have already sent an invitation to this email. You cannot send multiple invitations to the same email.'
      );
    }

    // 5. ⭐ VALIDACIÓN BIDIRECCIONAL - Verificar si YA ME INVITARON
    const receivedInvitation = await this.matchRequestAccessService.hasReceivedPendingInvitation(
      request.targetEmail,
      userId
    );

    if (receivedInvitation) {
      throw new BadRequestException(
        'This email has already sent you a match request. Please check your received invitations.'
      );
    }

    // 6. Buscar si existe un colaborador externo con ese email
    const targetCollaborators = await this.collaboratorAccessService.getExternalCollaboratorsByEmail(
      request.targetEmail
    );

    let matchRequest: CollaboratorMatchRequestAccessModel;
    let emailExists = false;
    let message = '';

    if (targetCollaborators.length === 0) {
      // Email NO existe en el sistema
      const requestData: CreateMatchRequestAccessRequest = {
        requesterUserId: userId,
        requesterCollaboratorId: request.collaboratorId,
        targetUserId: null,
        targetCollaboratorEmail: request.targetEmail,
      };

      matchRequest = await this.matchRequestAccessService.createRequest(requestData);
      emailExists = false;
      message = `Match request created. When a user registers with '${request.targetEmail}', they will be notified of your invitation.`;

    } else {
      const targetCollaborator = targetCollaborators[0];

      // Verificar que no sea del mismo usuario
      if (targetCollaborator.userId === userId) {
        throw new BadRequestException('Cannot match with your own collaborator');
      }

      // Verificar que no exista ya un match ACEPTADO
      const existingMatch = await this.matchAccessService.existsMatch(
        request.collaboratorId,
        targetCollaborator.id
      );

      if (existingMatch) {
        throw new BadRequestException('These collaborators are already matched');
      }

      const requestData: CreateMatchRequestAccessRequest = {
        requesterUserId: userId,
        requesterCollaboratorId: request.collaboratorId,
        targetUserId: targetCollaborator.userId,
        targetCollaboratorEmail: request.targetEmail,
      };

      matchRequest = await this.matchRequestAccessService.createRequest(requestData);
      emailExists = true;
      message = `Match request sent to user with email '${request.targetEmail}'`;

      await this.sendMatchRequestNotification(matchRequest);
    }

    return new MatchRequestResponseModel(
      matchRequest.id,
      matchRequest.status,
      emailExists,
      message,
      matchRequest.targetUserId || undefined
    );
  };

  public getLoginNotifications = async (userId: number, userEmail: string): Promise<{
    pendingMatchRequests: number;
    matchRequests: ReceivedMatchRequestModel[];
  }> => {
    const requests = await this.matchRequestAccessService.getReceivedRequests(
      userId,
      userEmail,
      MatchRequestStatus.Pending
    );

    const enrichedRequests = await Promise.all(requests.map(async (req) => {
      const collaborator = await this.collaboratorAccessService.getById(
        req.requesterCollaboratorId,
        req.requesterUserId
      );

      // ⭐ Obtener el email del usuario solicitante
      const requesterUser = (await this.userAccessService.getUsers()).find(x => x.id === req.requesterUserId);
      const requesterUserEmail = requesterUser?.email || 'Unknown';

      return new ReceivedMatchRequestModel(
        req.id,
        req.requesterUserId,
        req.requesterCollaboratorId,
        requesterUserEmail, // ⭐ Email del usuario que invita
        collaborator ? `${collaborator.name} ${collaborator.surname}` : 'Unknown',
        req.targetCollaboratorEmail,
        req.requestedDate
      );
    }));

    return {
      pendingMatchRequests: enrichedRequests.length,
      matchRequests: enrichedRequests
    };
  };

  /**
   * Obtener solicitudes de matching recibidas
   */
  public getReceivedMatchRequests = async (userId: number, userEmail: string): Promise<ReceivedMatchRequestModel[]> => {
    const requests = await this.matchRequestAccessService.getReceivedRequests(userId, userEmail, MatchRequestStatus.Pending);

    return Promise.all(requests.map(async (req) => {
      // ⭐ Obtener el colaborador del solicitante
      const collaborator = await this.collaboratorAccessService.getById(
        req.requesterCollaboratorId,
        req.requesterUserId
      );

      // ⭐ Obtener el email del usuario solicitante
      const requesterUser = (await this.userAccessService.getUsers()).find(x => x.id === req.requesterUserId);
      const requesterUserEmail = requesterUser?.email || 'Unknown';

      return new ReceivedMatchRequestModel(
        req.id,
        req.requesterUserId,
        req.requesterCollaboratorId,
        requesterUserEmail, // ⭐ Email del usuario que invita
        collaborator ? `${collaborator.name} ${collaborator.surname}` : 'Unknown',
        req.targetCollaboratorEmail,
        req.requestedDate
      );
    }));
  };

  /**
   * Obtener solicitudes de matching enviadas
   */
  public getSentMatchRequests = async (userId: number): Promise<CollaboratorMatchRequestModel[]> => {
    const requests = await this.matchRequestAccessService.getSentRequests(userId);

    // ⭐ Enriquecer con información del colaborador
    return Promise.all(requests.map(async (req) => {
      const collaborator = await this.collaboratorAccessService.getById(
        req.requesterCollaboratorId,
        req.requesterUserId
      );

      return new CollaboratorMatchRequestModel(
        req.id,
        req.requesterUserId,
        req.requesterCollaboratorId,
        collaborator?.name || 'Unknown', // ⭐ Nombre del colaborador
        collaborator?.surname || '', // ⭐ Apellido del colaborador
        req.targetCollaboratorEmail,
        req.status,
        req.requestedDate,
        req.responseDate,
        req.targetUserId
      );
    }));
  };


  /**
   * Aceptar solicitud de matching
   * @param collaboratorId - Opcional: ID de MI colaborador interno para asignarle el email del SOLICITANTE
   */
  public acceptMatchRequest = async (
    userId: number, 
    requestId: number,
    collaboratorId?: number
  ): Promise<CollaboratorMatchModel> => {
    const request = await this.matchRequestAccessService.getById(requestId, userId);

    if (!request) {
      throw new NotFoundException('Match request not found');
    }

    // ⭐ CAMBIO: Validación más flexible
    if (request.targetUserId !== null && request.targetUserId !== userId) {
      throw new BadRequestException('You are not authorized to accept this request');
    }

    if (request.status !== MatchRequestStatus.Pending) {
      throw new BadRequestException('This request is not pending');
    }

    // ⭐ NUEVO: Si targetUserId es NULL, asignarlo ahora
    if (request.targetUserId === null) {
      await this.matchRequestAccessService.updateTargetUser(requestId, userId);
      request.targetUserId = userId; // Actualizar en memoria
    }

    // Obtener el email del usuario SOLICITANTE
    const requesterUser = (await this.userAccessService.getUsers()).find(x => x.id === request.requesterUserId);
    if (!requesterUser) {
      throw new NotFoundException('Requester user not found');
    }
    const requesterEmail = requesterUser.email;

    const targetEmail = request.targetCollaboratorEmail;

    let myCollaborator: CollaboratorAccessModel | null;

    // Verificar si YA tengo un colaborador con el email del SOLICITANTE
    myCollaborator = await this.collaboratorAccessService.getMyCollaboratorByEmail(
      requesterEmail,
      userId,
    );

    // Si NO tengo colaborador con ese email, asignar uno interno
    if (!myCollaborator) {
      if (!collaboratorId) {
        throw new BadRequestException(
          `You need to select one of your internal collaborators to assign the email '${requesterEmail}' and complete the match.`
        );
      }

      const internalCollaborator = await this.collaboratorAccessService.getById(collaboratorId, userId);
      if (!internalCollaborator) {
        throw new NotFoundException('Collaborator not found');
      }

      if (internalCollaborator.email) {
        throw new BadRequestException('The selected collaborator already has an email. Please select an internal collaborator (without email).');
      }

      // Asignar el email del SOLICITANTE a MI colaborador
      await this.collaboratorAccessService.assignEmailToCollaborator(
        collaboratorId,
        requesterEmail,
        userId
      );

      myCollaborator = await this.collaboratorAccessService.getById(collaboratorId, userId);
    }

    // Asignar el email TARGET al colaborador del SOLICITANTE
    await this.collaboratorAccessService.assignEmailToCollaborator(
      request.requesterCollaboratorId,
      targetEmail,
      request.requesterUserId
    );

    // Crear el match
    const matchData: CreateMatchAccessRequest = {
      collaborator1Id: request.requesterCollaboratorId,
      collaborator2Id: myCollaborator.id,
      user1Id: request.requesterUserId,
      user2Id: userId
    };

    const match = await this.matchAccessService.createMatch(matchData);

    // ⭐ AHORA el update funcionará porque targetUserId ya tiene valor
    await this.matchRequestAccessService.updateStatus(
      requestId,
      MatchRequestStatus.Accepted,
      userId
    );

    await this.sendMatchAcceptedNotification(match);

    return this.getMatchModel(match);
  };

// ⭐ Actualizar getMatchModel
private getMatchModel = (accessModel: CollaboratorMatchAccessModel): CollaboratorMatchModel => {
  return new CollaboratorMatchModel(
    accessModel.id,
    accessModel.collaborator1Id,
    accessModel.collaborator2Id,
    accessModel.user1Id,
    accessModel.user2Id,
    accessModel.dateCreated
  );
};

// ⭐ Actualizar enrichCollaboratorWithMatchInfo
private enrichCollaboratorWithMatchInfo = async (collaborator: CollaboratorAccessModel, userId: number): Promise<EnrichedCollaboratorModel> => {
  const enriched = new EnrichedCollaboratorModel(
    collaborator.id,
    collaborator.name,
    collaborator.surname,
    collaborator.email,
    collaborator.userId,
    collaborator.isActive,
    collaborator.dateCreated,
    collaborator.type
  );

  if (collaborator.email) {
    const match = await this.matchAccessService.getMatchByCollaboratorId(collaborator.id);

    if (match) {
      enriched.matchStatus = 'matched';

      const otherCollabId = match.collaborator1Id === collaborator.id 
        ? match.collaborator2Id 
        : match.collaborator1Id;

      const otherUserId = match.user1Id === userId 
        ? match.user2Id 
        : match.user1Id;

      enriched.matchedWith = {
        userId: otherUserId,
        collaboratorId: otherCollabId,
        email: collaborator.email // ⭐ Usar el email del colaborador
      };
    } else {
      const pendingRequests = await this.matchRequestAccessService.getRequestsByCollaborator(
        collaborator.id,
        MatchRequestStatus.Pending
      );

      const emailNotFoundRequests = await this.matchRequestAccessService.getRequestsByCollaborator(
        collaborator.id,
        MatchRequestStatus.EmailNotFound
      );

      if (emailNotFoundRequests.length > 0) {
        enriched.matchStatus = 'emailnotfound';
        enriched.pendingRequestsCount = emailNotFoundRequests.length;
      } else if (pendingRequests.length > 0) {
        enriched.matchStatus = 'pending';
        enriched.pendingRequestsCount = pendingRequests.length;
      } else {
        enriched.matchStatus = 'unmatched';
      }
    }
  }

  return enriched;
};

  /**
   * Cancelar solicitud enviada (solo el que envió puede cancelar)
   */
  public cancelMatchRequest = async (userId: number, requestId: number): Promise<void> => {
    const request = await this.matchRequestAccessService.getById(requestId, userId);
    
    if (!request) {
      throw new NotFoundException('Match request not found');
    }

    if (request.requesterUserId !== userId) {
      throw new BadRequestException('You can only cancel requests that you sent');
    }

    if (request.status !== MatchRequestStatus.Pending && request.status !== MatchRequestStatus.EmailNotFound) {
      throw new BadRequestException('Cannot cancel a request that has already been accepted');
    }

    await this.matchRequestAccessService.deleteRequest(requestId, userId);
  };

  /**
   * Procesar solicitudes cuando un nuevo usuario se registra
   * Este método se llama desde el servicio de autenticación
   */
  public processEmailNotFoundRequests = async (email: string, newUserId: number): Promise<void> => {
    // Buscar todas las solicitudes con EMAIL_NOT_FOUND para este email
    const requests = await this.matchRequestAccessService.getRequestsByEmail(
      email,
      MatchRequestStatus.EmailNotFound
    );

    for (const request of requests) {
      // Actualizar el targetUserId y cambiar status a PENDING
      await this.matchRequestAccessService.updateTargetUser(request.id, newUserId);

      // Enviar notificación al nuevo usuario
      await this.sendMatchRequestNotification(request);
    }
  };

  // ==================== MATCHES ====================

  /**
   * Obtener todos los matches del usuario
   */
  public getUserMatches = async (userId: number): Promise<CollaboratorMatchModel[]> => {
    const accessModelList = await this.matchAccessService.getMatchesByUserId(userId);
    return Promise.all(accessModelList.map(async (match) => {
      const collaborator1 = await this.collaboratorAccessService.getById(match.collaborator1Id, match.user1Id);
      const collaborator2 = await this.collaboratorAccessService.getById(match.collaborator2Id, match.user2Id);

      const baseModel = this.getMatchModel(match);

      // Determinar cuál es "mi" colaborador y cuál es el "matched"
      const isUser1 = match.user1Id === userId;

      return {
        ...baseModel,
        collaboratorName: isUser1 ? collaborator1?.name : collaborator2?.name,
        collaboratorSurname: isUser1 ? collaborator1?.surname : collaborator2?.surname,
        matchedCollaboratorName: isUser1 ? collaborator2?.name : collaborator1?.name,
        matchedCollaboratorSurname: isUser1 ? collaborator2?.surname : collaborator1?.surname,
      };
    }));
  };

  /**
   * Eliminar un match (deshacer matching)
   */
  public deleteMatch = async (userId: number, matchId: number): Promise<void> => {
    const match = await this.matchAccessService.getMatchById(matchId);

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    // Verificar que el usuario sea parte del match
    if (match.user1Id !== userId && match.user2Id !== userId) {
      throw new BadRequestException('You are not authorized to delete this match');
    }

    await this.matchAccessService.deleteMatch(matchId);
  };

  /**
   * Obtener invitaciones recibidas para un colaborador externo específico
   * Muestra quién invitó a este colaborador por su email
   * 
   * Ejemplo:
   * - Yo (Porfi) tengo un colaborador externo "Leti" con email leti@gmail.com
   * - Leti (como usuaria) me invitó a mi email
   * - Este método me muestra la invitación de Leti hacia mi colaborador
   */
public getInvitationsForCollaborator = async (userId: number, collaboratorId: number): Promise<ReceivedMatchRequestModel[]> => {
  const collaborator = await this.collaboratorAccessService.getById(collaboratorId, userId);
  
  if (!collaborator) {
    throw new NotFoundException('Collaborator not found');
  }

  if (!collaborator.email) {
    throw new BadRequestException('Only external collaborators can receive invitations');
  }

  const requests = await this.matchRequestAccessService.getReceivedRequests(
    userId,
    MatchRequestStatus.Pending
  );

  const collaboratorRequests = requests.filter(
    req => req.targetCollaboratorEmail.toLowerCase() === collaborator.email.toLowerCase()
  );

  return Promise.all(collaboratorRequests.map(async (req) => {
    const requesterCollab = await this.collaboratorAccessService.getById(
      req.requesterCollaboratorId,
      req.requesterUserId
    );

    // ⭐ Obtener el email del usuario solicitante
    const requesterUser = (await this.userAccessService.getUsers()).find(x => x.id === req.requesterUserId);
    const requesterUserEmail = requesterUser?.email || 'Unknown';

    return new ReceivedMatchRequestModel(
      req.id,
      req.requesterUserId,
      req.requesterCollaboratorId,
      requesterUserEmail, // ⭐ Email del usuario que invita
      requesterCollab ? `${requesterCollab.name} ${requesterCollab.surname}` : 'Unknown',
      req.targetCollaboratorEmail,
      req.requestedDate
    );
  }));
};

  /**
   * Obtener todos los colaboradores con información de matching enriquecida
   */
  public getAllEnriched = async (userId: number): Promise<EnrichedCollaboratorModel[]> => {
    const collaborators = await this.collaboratorAccessService.getAll(userId);

    const enriched = await Promise.all(collaborators.map(collab => this.enrichCollaboratorWithMatchInfo(collab, userId)));

    return enriched;
  };

  /**
   * Obtener colaboradores externos con información de matching
   */
  public getLinkedCollaboratorsEnriched = async (userId: number): Promise<EnrichedCollaboratorModel[]> => {
    const collaborators = await this.collaboratorAccessService.getLinkedCollaborators(userId);
    const enriched = await Promise.all(collaborators.map(collab => this.enrichCollaboratorWithMatchInfo(collab, userId)));
    return enriched;
  };

  /**
   * Obtener un colaborador específico con información de matching
   */
  public getByIdEnriched = async (id: number, userId: number): Promise<EnrichedCollaboratorModel> => {
    const collaborator = await this.collaboratorAccessService.getById(id, userId);
    if (!collaborator) {
      throw new NotFoundException('Collaborator not found');
    }
    return await this.enrichCollaboratorWithMatchInfo(collaborator, userId);
  };

  /**
   * Reenviar invitación a colaborador externo
   */
  public resendInvitation = async (userId: number, collaboratorId: number): Promise<void> => {
    const collaborator = await this.collaboratorAccessService.getById(collaboratorId, userId);
    
    if (!collaborator) {
      throw new NotFoundException('Collaborator not found');
    }

    if (!collaborator.email) {
      throw new BadRequestException('Only external collaborators can receive invitations');
    }

    await this.sendInvitationEmail(collaborator);
  };

  /**
   * Obtener invitaciones agrupadas por colaborador
   * Muestra para cada colaborador externo, quién le ha enviado invitaciones
   */
  public getInvitationsByCollaborator = async (userId: number): Promise<CollaboratorInvitationModel[]> => {
    const externalCollaborators = await this.collaboratorAccessService.getLinkedCollaborators(userId);
    const invitationsByCollaborator = await Promise.all(
      externalCollaborators.map(async (x) => {
        const invitations = await this.getInvitationsForCollaborator(userId, x.id);
        const collaborator = new CollaboratorSummaryModel(x.id, x.name, x.surname, x.email)
        return new CollaboratorInvitationModel(collaborator, invitations, invitations.length) ;
      })
    );

    // Filtrar solo los colaboradores que tienen invitaciones
    return invitationsByCollaborator.filter(item => item.invitationsCount > 0);
  };

  // ==================== MÉTODOS PRIVADOS ====================
  private getModel = (accessModel: CollaboratorAccessModel): CollaboratorModel => {
    return new CollaboratorModel(
      accessModel.id,
      accessModel.name,
      accessModel.surname,
      accessModel.email,
      accessModel.userId,
      accessModel.isActive,
      accessModel.dateCreated,
      accessModel.type
    );
  };

  /**
   * Enviar email de invitación a colaborador externo
   */
  private sendInvitationEmail = async (collaborator: CollaboratorAccessModel): Promise<void> => {
    // TODO: Implementar con tu servicio de email
    console.log(`Sending invitation to ${collaborator.email}`);
    // await this.emailService.sendCollaboratorInvitation(collaborator);
  };

  /**
   * Enviar notificación de solicitud de matching
   */
  private sendMatchRequestNotification = async (request: CollaboratorMatchRequestAccessModel): Promise<void> => {
    // TODO: Implementar notificación
    console.log(`Match request sent to user ${request.targetUserId}`);
    // await this.notificationService.sendMatchRequestNotification(request);
  };

  /**
   * Enviar notificación de matching aceptado
   */
  private sendMatchAcceptedNotification = async (match: CollaboratorMatchAccessModel): Promise<void> => {
    // TODO: Implementar notificación
    console.log(`Match accepted between users ${match.user1Id} and ${match.user2Id}`);
    // await this.notificationService.sendMatchAcceptedNotification(match);
  };

}