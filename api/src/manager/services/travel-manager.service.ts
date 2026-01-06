import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TRAVEL_TOKENS, COLLABORATOR_TOKENS } from '../../utility/constants';
import { TravelStatus, TravelOperationStatus, ApprovalStatus, TravelSplitType } from '../../utility/enums';
import {
  ITravelAccessService,
  ITravelMemberAccessService,
  ITravelOperationAccessService,
  ITravelOperationParticipantAccessService,
  ITravelOperationApprovalAccessService,
  IPaymentMethodAccessService,
  TravelMemberAccessModel,
  TravelOperationAccessModel,
  UpdateTravelAccessRequest,
  TravelAccessModel,
  CreateTravelOperationAccessRequest,
  TravelOperationApprovalAccessModel,
  CreateTravelAccessRequest,
  AddTravelMemberAccessRequest,
  TravelOperationParticipantAccessModel,
  UpdateTravelOperationAccessRequest,
} from '../../access/contract/travels';
import { ICollaboratorAccessService } from '../../access/contract/collaborators';
import {
  TravelModel,
  CreateTravelRequest,
  UpdateTravelRequest,
  TravelMemberModel,
  AddTravelMemberRequest,
  TravelOperationModel,
  CreateTravelOperationRequest,
  UpdateTravelOperationRequest,
  ApproveOperationRequest,
  RejectOperationRequest,
  PaymentMethodModel,
  TravelBalanceDetailModel,
  TravelBalanceSimplifiedModel,
  TravelBalanceByCurrencyModel,
  DebtDetailModel,
  CreditDetailModel,
  SettlementModel,
} from '../models/travels';

@Injectable()
export class TravelManagerService {
  constructor(
    @Inject(TRAVEL_TOKENS.ACCESS_SERVICE)
    private travelAccessService: ITravelAccessService,

    @Inject(TRAVEL_TOKENS.MEMBER_ACCESS_SERVICE)
    private travelMemberAccessService: ITravelMemberAccessService,

    @Inject(TRAVEL_TOKENS.OPERATION_ACCESS_SERVICE)
    private travelOperationAccessService: ITravelOperationAccessService,

    @Inject(TRAVEL_TOKENS.OPERATION_PARTICIPANT_ACCESS_SERVICE)
    private travelOperationParticipantAccessService: ITravelOperationParticipantAccessService,

    @Inject(TRAVEL_TOKENS.OPERATION_APPROVAL_ACCESS_SERVICE)
    private travelOperationApprovalAccessService: ITravelOperationApprovalAccessService,

    @Inject(TRAVEL_TOKENS.PAYMENT_METHOD_ACCESS_SERVICE)
    private paymentMethodAccessService: IPaymentMethodAccessService,

    @Inject(COLLABORATOR_TOKENS.ACCESS_SERVICE)
    private collaboratorAccessService: ICollaboratorAccessService,
  ) {}

  // ==================== PAYMENT METHODS ====================

  public getAllPaymentMethods = async (): Promise<PaymentMethodModel[]> => {
    const accessModels = await this.paymentMethodAccessService.getAll();
    return accessModels.map(x => new PaymentMethodModel(x.id, x.name, x.dateCreated));
  };

  // ==================== TRAVELS ====================

  public createTravel = async (request: CreateTravelRequest): Promise<TravelModel> => {
    const accessRequest = new CreateTravelAccessRequest(
      request.name,
      request.userId,
      request.description,
      request.startDate,
      request.endDate,
      request.defaultCurrencyId,
    );

    const accessModel = await this.travelAccessService.create(accessRequest);

    // Agregar al creador como primer miembro del viaje
    const creatorCollaborator = await this.collaboratorAccessService.getById(0, request.userId); // Necesitamos un colaborador del usuario creador
    // TODO: Determinar cómo obtener el collaboratorId del usuario creador

    return this.mapTravelAccessToModel(accessModel);
  };

  public getTravelById = async (id: number, userId: number): Promise<TravelModel> => {
    const accessModel = await this.travelAccessService.getById(id, userId);
    if (!accessModel) {
      throw new NotFoundException('Travel not found');
    }
    return this.mapTravelAccessToModel(accessModel);
  };

  public getAllTravelsByUser = async (userId: number): Promise<TravelModel[]> => {
    const accessModels = await this.travelAccessService.getAllByUserId(userId);
    return accessModels.map(this.mapTravelAccessToModel);
  };

  public getActiveTravels = async (userId: number): Promise<TravelModel[]> => {
    const accessModels = await this.travelAccessService.getByStatus(userId, TravelStatus.Active);
    return accessModels.map(this.mapTravelAccessToModel);
  };

  public getFinalizedTravels = async (userId: number): Promise<TravelModel[]> => {
    const accessModels = await this.travelAccessService.getByStatus(userId, TravelStatus.Finalized);
    return accessModels.map(this.mapTravelAccessToModel);
  };

  public updateTravel = async (request: UpdateTravelRequest): Promise<TravelModel> => {
    // Verificar que el usuario es el creador
    const isCreator = await this.travelAccessService.isCreator(request.id, request.userId);
    if (!isCreator) {
      throw new BadRequestException('Only the travel creator can update it');
    }

    // Obtener el travel actual
    const currentTravel = await this.travelAccessService.getById(request.id, request.userId);
    if (!currentTravel) {
      throw new NotFoundException('Travel not found');
    }

    const accessRequest = new UpdateTravelAccessRequest(
      request.id,
      request.name,
      request.userId,
      currentTravel.status,
      request.description,
      request.startDate,
      request.endDate,
      request.defaultCurrencyId,
      request.userId,
      currentTravel.finalizedDate,
    );

    const accessModel = await this.travelAccessService.update(accessRequest);
    return this.mapTravelAccessToModel(accessModel);
  };

  public finalizeTravel = async (id: number, userId: number): Promise<TravelModel> => {
    // Verificar que el usuario es miembro del viaje
    const isMember = await this.travelAccessService.isMember(id, userId);
    if (!isMember) {
      throw new BadRequestException('Only travel members can finalize it');
    }

    // Validar que el viaje puede cerrarse
    await this.validateTravelCanBeClosed(id);

    const accessModel = await this.travelAccessService.finalize(id, userId);
    return this.mapTravelAccessToModel(accessModel);
  };

  public deleteTravel = async (id: number, userId: number): Promise<void> => {
    // Verificar que el usuario es el creador
    const isCreator = await this.travelAccessService.isCreator(id, userId);
    if (!isCreator) {
      throw new BadRequestException('Only the travel creator can delete it');
    }

    // Verificar que el viaje está finalizado
    const travel = await this.travelAccessService.getById(id, userId);
    if (!travel) {
      throw new NotFoundException('Travel not found');
    }

    if (travel.status !== TravelStatus.Finalized) {
      throw new BadRequestException('Only finalized travels can be deleted');
    }

    await this.travelAccessService.delete(id, userId);
  };

  // ==================== PRIVATE HELPERS ====================

  private mapTravelAccessToModel = (accessModel: TravelAccessModel): TravelModel => {
    return new TravelModel(
      accessModel.id,
      accessModel.name,
      accessModel.createdByUserId,
      accessModel.status,
      accessModel.dateCreated,
      accessModel.description,
      accessModel.startDate,
      accessModel.endDate,
      accessModel.defaultCurrencyId,
      accessModel.lastUpdatedByUserId,
      accessModel.updatedAt,
      accessModel.finalizedDate,
    );
  };

  private validateTravelCanBeClosed = async (travelId: number): Promise<void> => {
    // Validación 1: Debe haber al menos una operación
    const operationCount = await this.travelOperationAccessService.countByTravelId(travelId);
    if (operationCount === 0) {
      throw new BadRequestException('Cannot close travel without operations');
    }

    // Validación 2: Todas las operaciones deben estar aprobadas
    const allApproved = await this.travelOperationAccessService.areAllApproved(travelId);
    if (!allApproved) {
      throw new BadRequestException('Cannot close travel with pending or rejected operations');
    }

    // Validación 3: Los balances deben cuadrar por moneda
    const operations = await this.travelOperationAccessService.getByTravelId(travelId);
    const groupedByCurrency = await this.travelOperationAccessService.getGroupedByCurrency(travelId);

    for (const group of groupedByCurrency) {
      const totalPaid = group.operations.reduce((sum, op) => sum + op.amount, 0);
      
      // Obtener todos los participantes de todas las operaciones en esta moneda
      let totalOwed = 0;
      for (const operation of group.operations) {
        const participants = await this.travelOperationParticipantAccessService.getByOperationId(operation.id);
        totalOwed += participants.reduce((sum, p) => sum + p.shareAmount, 0);
      }

      // Validar que cuadra (con margen de error por decimales)
      const difference = Math.abs(totalPaid - totalOwed);
      if (difference > 0.01) {
        throw new BadRequestException(
          `Balances do not match for currency ${group.currencyId}. Total paid: ${totalPaid}, Total owed: ${totalOwed}`
        );
      }
    }
  };

  // ==================== TRAVEL MEMBERS ====================

  public addTravelMember = async (request: AddTravelMemberRequest): Promise<TravelMemberModel> => {
    // Verificar que el usuario es miembro o creador del viaje
    const isMember = await this.travelAccessService.isMember(request.travelId, request.userId);
    const isCreator = await this.travelAccessService.isCreator(request.travelId, request.userId);
    
    if (!isMember && !isCreator) {
      throw new BadRequestException('Only travel members can add new members');
    }

    // Verificar que el viaje está activo
    const travel = await this.travelAccessService.getById(request.travelId, request.userId);
    if (!travel) {
      throw new NotFoundException('Travel not found');
    }

    if (travel.status !== TravelStatus.Active) {
      throw new BadRequestException('Cannot add members to a finalized travel');
    }

    // Verificar que el colaborador existe y tiene email (es externo)
    const collaborator = await this.collaboratorAccessService.getById(request.collaboratorId, request.userId);
    if (!collaborator) {
      throw new NotFoundException('Collaborator not found');
    }

    if (!collaborator.email) {
      throw new BadRequestException('Only external collaborators (with email) can be added to travels');
    }

    // Verificar que el colaborador no está ya en el viaje
    const isAlreadyMember = await this.travelMemberAccessService.isMemberInTravel(
      request.travelId,
      request.collaboratorId
    );

    if (isAlreadyMember) {
      throw new BadRequestException('Collaborator is already a member of this travel');
    }

    const accessRequest = new AddTravelMemberAccessRequest(
      request.travelId,
      request.userId,
      request.collaboratorId,
    );

    const accessModel = await this.travelMemberAccessService.add(accessRequest);
    return await this.enrichTravelMemberModel(accessModel);
  };

  public getTravelMembers = async (travelId: number, userId: number): Promise<TravelMemberModel[]> => {
    // Verificar que el usuario es miembro del viaje
    const isMember = await this.travelAccessService.isMember(travelId, userId);
    const isCreator = await this.travelAccessService.isCreator(travelId, userId);
    
    if (!isMember && !isCreator) {
      throw new BadRequestException('Only travel members can view members');
    }

    const accessModels = await this.travelMemberAccessService.getByTravelId(travelId);
    return await Promise.all(accessModels.map(this.enrichTravelMemberModel));
  };

  public removeTravelMember = async (memberId: number, userId: number): Promise<void> => {
    // Obtener el miembro
    const member = await this.travelMemberAccessService.getById(memberId);
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Verificar que el usuario es miembro del viaje
    const isMember = await this.travelAccessService.isMember(member.travelId, userId);
    if (!isMember) {
      throw new BadRequestException('Only travel members can remove members');
    }

    // Verificar que el viaje está activo
    const travel = await this.travelAccessService.getById(member.travelId, userId);
    if (!travel) {
      throw new NotFoundException('Travel not found');
    }

    if (travel.status !== TravelStatus.Active) {
      throw new BadRequestException('Cannot remove members from a finalized travel');
    }

    // Verificar que el miembro no tiene operaciones asociadas
    const hasOperations = await this.travelMemberAccessService.hasOperations(memberId);
    if (hasOperations) {
      throw new BadRequestException('Cannot remove member with associated operations');
    }

    await this.travelMemberAccessService.remove(memberId);
  };

  private enrichTravelMemberModel = async (accessModel: TravelMemberAccessModel): Promise<TravelMemberModel> => {
    // Obtener información del colaborador
    const collaborator = await this.collaboratorAccessService.getById(
      accessModel.collaboratorId,
      accessModel.userId
    );

    return new TravelMemberModel(
      accessModel.id,
      accessModel.travelId,
      accessModel.userId,
      accessModel.collaboratorId,
      collaborator?.name || 'Unknown',
      collaborator?.surname || '',
      collaborator?.email || null,
      accessModel.joinedDate,
    );
  };

  // ==================== TRAVEL OPERATIONS - CREATE ====================

  public createTravelOperation = async (request: CreateTravelOperationRequest): Promise<TravelOperationModel> => {
    // Verificar que el usuario es miembro del viaje
    const isMember = await this.travelAccessService.isMember(request.travelId, request.userId);
    if (!isMember) {
      throw new BadRequestException('Only travel members can create operations');
    }

    // Verificar que el viaje está activo
    const travel = await this.travelAccessService.getById(request.travelId, request.userId);
    if (!travel) {
      throw new NotFoundException('Travel not found');
    }

    if (travel.status !== TravelStatus.Active) {
      throw new BadRequestException('Cannot add operations to a finalized travel');
    }

    // Validar que el monto es positivo
    if (request.amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    // Validar que quien pagó es miembro del viaje
    const whoPaidMember = await this.travelMemberAccessService.getById(request.whoPaidMemberId);
    if (!whoPaidMember || whoPaidMember.travelId !== request.travelId) {
      throw new BadRequestException('Who paid member must be part of the travel');
    }

    // Validar participantes según splitType
    let participantIds: number[];
    if (request.splitType === TravelSplitType.All) {
      // Obtener todos los miembros del viaje
      const allMembers = await this.travelMemberAccessService.getByTravelId(request.travelId);
      participantIds = allMembers.map(x => x.id);
    } else {
      // Usar los IDs proporcionados
      participantIds = request.participantMemberIds;

      // Validar que hay al menos un participante
      if (participantIds.length === 0) {
        throw new BadRequestException('At least one participant is required');
      }

      // Validar que todos los participantes son miembros del viaje
      for (const participantId of participantIds) {
        const member = await this.travelMemberAccessService.getById(participantId);
        if (!member || member.travelId !== request.travelId) {
          throw new BadRequestException(`Member ${participantId} is not part of the travel`);
        }
      }
    }

    // Verificar que el usuario que crea está en los participantes
    const userMember = await this.getUserMemberInTravel(request.travelId, request.userId);
    if (!userMember) {
      throw new BadRequestException('Creator must be a member of the travel');
    }

    if (!participantIds.includes(userMember.id)) {
      throw new BadRequestException('Creator must be a participant in the operation');
    }

    // Crear la operación
    const accessRequest = new CreateTravelOperationAccessRequest(
      request.travelId,
      request.userId,
      request.currencyId,
      request.paymentMethodId,
      request.whoPaidMemberId,
      request.amount,
      request.description,
      request.splitType,
      request.transactionDate,
    );

    const operationAccessModel = await this.travelOperationAccessService.create(accessRequest);

    // Calcular y agregar participantes con shareAmount
    const shareAmount = request.amount / participantIds.length;
    const participantRequests = participantIds.map(memberId => new TravelOperationParticipantAccessModel(
      operationAccessModel.id,
      memberId,
      shareAmount,
    ));

    await this.travelOperationParticipantAccessService.addMultiple(participantRequests);

    // Crear aprobaciones para todos los participantes
    const approvalRequests = participantIds.map(memberId => new TravelOperationApprovalAccessModel(
      operationAccessModel.id,
      memberId,
      memberId === userMember.id ? ApprovalStatus.Approved : ApprovalStatus.Pending,
    ));

    await this.travelOperationApprovalAccessService.createMultiple(approvalRequests);

    // Actualizar estado de la operación si está completamente aprobada
    if (participantIds.length === 1) {
      await this.travelOperationAccessService.updateStatus(
        operationAccessModel.id,
        TravelOperationStatus.Approved
      );
    }

    return await this.enrichTravelOperationModel(operationAccessModel);
  };

  private getUserMemberInTravel = async (travelId: number, userId: number): Promise<TravelMemberAccessModel> => {
    const members = await this.travelMemberAccessService.getByTravelId(travelId);
    return members.find(x => x.userId === userId);
  };

  // ==================== TRAVEL OPERATIONS - UPDATE & DELETE ====================

  public updateTravelOperation = async (request: UpdateTravelOperationRequest): Promise<TravelOperationModel> => {
    // Obtener la operación actual
    const currentOperation = await this.travelOperationAccessService.getById(request.operationId);
    if (!currentOperation) {
      throw new NotFoundException('Operation not found');
    }

    // Verificar que el viaje está activo
    const travel = await this.travelAccessService.getById(request.travelId, request.userId);
    if (!travel) {
      throw new NotFoundException('Travel not found');
    }

    if (travel.status !== TravelStatus.Active) {
      throw new BadRequestException('Cannot update operations in a finalized travel');
    }

    // Verificar permisos de modificación
    const userMember = await this.getUserMemberInTravel(request.travelId, request.userId);
    if (!userMember) {
      throw new BadRequestException('User is not a member of the travel');
    }

    const isCreator = currentOperation.createdByUserId === request.userId;
    const participants = await this.travelOperationParticipantAccessService.getByOperationId(request.operationId);
    const isParticipant = participants.some(x => x.travelMemberId === userMember.id);

    if (!isCreator && !isParticipant) {
      throw new BadRequestException('Only creator or participants can update the operation');
    }

    // Si no es creador, solo puede modificar ciertos campos (no participantes)
    if (!isCreator && JSON.stringify(request.participantMemberIds) !== JSON.stringify(participants.map(p => p.travelMemberId))) {
      throw new BadRequestException('Only creator can modify participants');
    }

    // Validar que el usuario está en los nuevos participantes
    if (!request.participantMemberIds.includes(userMember.id)) {
      throw new BadRequestException('User must be a participant in the operation');
    }

    // Actualizar la operación
    const accessRequest = new UpdateTravelOperationAccessRequest(
      request.operationId,
      request.travelId,
      request.currencyId,
      request.paymentMethodId,
      request.whoPaidMemberId,
      request.amount,
      request.description,
      request.splitType,
      request.transactionDate,
      request.userId,
    );

    const operationAccessModel = await this.travelOperationAccessService.update(accessRequest);

    // Recalcular participantes
    await this.travelOperationParticipantAccessService.removeAllByOperationId(request.operationId);
    const shareAmount = request.amount / request.participantMemberIds.length;
    const participantRequests = request.participantMemberIds.map(memberId => ({
      operationId: request.operationId,
      travelMemberId: memberId,
      shareAmount: shareAmount,
    }));
    await this.travelOperationParticipantAccessService.addMultiple(participantRequests);

    // Resetear aprobaciones
    await this.travelOperationApprovalAccessService.deleteAllByOperationId(request.operationId);
    const approvalRequests = request.participantMemberIds.map(memberId => ({
      operationId: request.operationId,
      memberId: memberId,
      status: memberId === userMember.id ? ApprovalStatus.Approved : ApprovalStatus.Pending,
    }));
    await this.travelOperationApprovalAccessService.createMultiple(approvalRequests);

    // Actualizar estado de la operación
    await this.travelOperationAccessService.updateStatus(
      request.operationId,
      request.participantMemberIds.length === 1 ? TravelOperationStatus.Approved : TravelOperationStatus.Pending
    );

    return await this.enrichTravelOperationModel(operationAccessModel);
  };

  public deleteTravelOperation = async (operationId: number, userId: number): Promise<void> => {
    // Obtener la operación
    const operation = await this.travelOperationAccessService.getById(operationId);
    if (!operation) {
      throw new NotFoundException('Operation not found');
    }

    // Verificar que el viaje está activo
    const travel = await this.travelAccessService.getById(operation.travelId, userId);
    if (!travel) {
      throw new NotFoundException('Travel not found');
    }

    if (travel.status !== TravelStatus.Active) {
      throw new BadRequestException('Cannot delete operations in a finalized travel');
    }

    // Verificar que el usuario es el creador de la operación
    if (operation.createdByUserId !== userId) {
      throw new BadRequestException('Only the creator can delete the operation');
    }

    // Verificar que no todas las aprobaciones están completas
    const isFullyApproved = await this.travelOperationApprovalAccessService.isFullyApproved(operationId);
    if (isFullyApproved) {
      throw new BadRequestException('Cannot delete a fully approved operation. Someone must reject it first.');
    }

    await this.travelOperationAccessService.delete(operationId);
  };

  public getTravelOperations = async (travelId: number, userId: number): Promise<TravelOperationModel[]> => {
    // Verificar que el usuario es miembro del viaje
    const isMember = await this.travelAccessService.isMember(travelId, userId);
    const isCreator = await this.travelAccessService.isCreator(travelId, userId);
    
    if (!isMember && !isCreator) {
      throw new BadRequestException('Only travel members can view operations');
    }

    const accessModels = await this.travelOperationAccessService.getByTravelId(travelId);
    return await Promise.all(accessModels.map(this.enrichTravelOperationModel));
  };

  public getTravelOperationById = async (operationId: number, userId: number): Promise<TravelOperationModel> => {
    const operation = await this.travelOperationAccessService.getById(operationId);
    if (!operation) {
      throw new NotFoundException('Operation not found');
    }

    // Verificar que el usuario es miembro del viaje
    const isMember = await this.travelAccessService.isMember(operation.travelId, userId);
    const isCreator = await this.travelAccessService.isCreator(operation.travelId, userId);
    
    if (!isMember && !isCreator) {
      throw new BadRequestException('Only travel members can view operations');
    }

    return await this.enrichTravelOperationModel(operation);
  };

  private enrichTravelOperationModel = async (accessModel: TravelOperationAccessModel): Promise<TravelOperationModel> => {
    // Obtener información adicional
    const participants = await this.travelOperationParticipantAccessService.getByOperationId(accessModel.id);
    const approvals = await this.travelOperationApprovalAccessService.getByOperationId(accessModel.id);
    const pendingApprovals = approvals.filter(a => a.status === ApprovalStatus.Pending);

    return new TravelOperationModel(
      accessModel.id,
      accessModel.travelId,
      accessModel.createdByUserId,
      accessModel.currencyId,
      accessModel.paymentMethodId,
      accessModel.whoPaidMemberId,
      accessModel.amount,
      accessModel.description,
      accessModel.splitType,
      accessModel.status,
      accessModel.dateCreated,
      accessModel.transactionDate,
      accessModel.lastUpdatedByUserId,
      accessModel.updatedAt,
      undefined, // currencySymbol - puede enriquecerse si es necesario
      undefined, // paymentMethodName - puede enriquecerse si es necesario
      undefined, // whoPaidMemberName - puede enriquecerse si es necesario
      participants.length,
      approvals.length,
      pendingApprovals.length,
    );
  };

  // ==================== TRAVEL OPERATION APPROVALS ====================

  public approveOperation = async (request: ApproveOperationRequest): Promise<TravelOperationModel> => {
    // Obtener la operación
    const operation = await this.travelOperationAccessService.getById(request.operationId);
    if (!operation) {
      throw new NotFoundException('Operation not found');
    }

    // Verificar que el viaje está activo
    const travel = await this.travelAccessService.getById(operation.travelId, request.userId);
    if (!travel) {
      throw new NotFoundException('Travel not found');
    }

    if (travel.status !== TravelStatus.Active) {
      throw new BadRequestException('Cannot approve operations in a finalized travel');
    }

    // Verificar que el usuario es miembro del viaje
    const userMember = await this.getUserMemberInTravel(operation.travelId, request.userId);
    if (!userMember) {
      throw new BadRequestException('User is not a member of the travel');
    }

    // Verificar que el usuario es participante de la operación
    const isParticipant = await this.travelOperationParticipantAccessService.isParticipant(
      request.operationId,
      userMember.id
    );

    if (!isParticipant) {
      throw new BadRequestException('Only participants can approve the operation');
    }

    // Obtener la aprobación del usuario
    const approval = await this.travelOperationApprovalAccessService.getByOperationAndMember(
      request.operationId,
      userMember.id
    );

    if (!approval) {
      throw new NotFoundException('Approval not found');
    }

    if (approval.status === ApprovalStatus.Approved) {
      throw new BadRequestException('Operation already approved by this user');
    }

    // Aprobar
    await this.travelOperationApprovalAccessService.approve(request.operationId, userMember.id);

    // Verificar si la operación está completamente aprobada
    const isFullyApproved = await this.travelOperationApprovalAccessService.isFullyApproved(request.operationId);
    if (isFullyApproved) {
      await this.travelOperationAccessService.updateStatus(
        request.operationId,
        TravelOperationStatus.Approved
      );
    }

    const updatedOperation = await this.travelOperationAccessService.getById(request.operationId);
    return await this.enrichTravelOperationModel(updatedOperation!);
  };

  public rejectOperation = async (request: RejectOperationRequest): Promise<TravelOperationModel> => {
    // Obtener la operación
    const operation = await this.travelOperationAccessService.getById(request.operationId);
    if (!operation) {
      throw new NotFoundException('Operation not found');
    }

    // Verificar que el viaje está activo
    const travel = await this.travelAccessService.getById(operation.travelId, request.userId);
    if (!travel) {
      throw new NotFoundException('Travel not found');
    }

    if (travel.status !== TravelStatus.Active) {
      throw new BadRequestException('Cannot reject operations in a finalized travel');
    }

    // Verificar que el usuario es miembro del viaje
    const userMember = await this.getUserMemberInTravel(operation.travelId, request.userId);
    if (!userMember) {
      throw new BadRequestException('User is not a member of the travel');
    }

    // Verificar que el usuario es participante de la operación
    const isParticipant = await this.travelOperationParticipantAccessService.isParticipant(
      request.operationId,
      userMember.id
    );

    if (!isParticipant) {
      throw new BadRequestException('Only participants can reject the operation');
    }

    // Obtener la aprobación del usuario
    const approval = await this.travelOperationApprovalAccessService.getByOperationAndMember(
      request.operationId,
      userMember.id
    );

    if (!approval) {
      throw new NotFoundException('Approval not found');
    }

    if (approval.status === ApprovalStatus.Rejected) {
      throw new BadRequestException('Operation already rejected by this user');
    }

    // Rechazar
    await this.travelOperationApprovalAccessService.reject(
      request.operationId,
      userMember.id,
      request.rejectionReason
    );

    // Actualizar estado de la operación a Rejected
    await this.travelOperationAccessService.updateStatus(
      request.operationId,
      TravelOperationStatus.Rejected
    );

    const updatedOperation = await this.travelOperationAccessService.getById(request.operationId);
    return await this.enrichTravelOperationModel(updatedOperation!);
  };

  // ==================== TRAVEL BALANCES ====================

  public getTravelBalancesByCurrency = async (
    travelId: number,
    userId: number
  ): Promise<TravelBalanceByCurrencyModel[]> => {
    // Verificar que el usuario es miembro del viaje
    const isMember = await this.travelAccessService.isMember(travelId, userId);
    const isCreator = await this.travelAccessService.isCreator(travelId, userId);
    
    if (!isMember && !isCreator) {
      throw new BadRequestException('Only travel members can view balances');
    }

    // Obtener operaciones agrupadas por moneda
    const groupedByCurrency = await this.travelOperationAccessService.getGroupedByCurrency(travelId);
    
    const balancesByCurrency: TravelBalanceByCurrencyModel[] = [];

    for (const group of groupedByCurrency) {
      const detailedBalances = await this.calculateDetailedBalances(travelId, group.currencyId);
      const simplifiedBalances = this.calculateSimplifiedBalances(detailedBalances);

      // Obtener información de la moneda (esto debería venir de ConfigurationAccessService)
      // Por ahora usamos valores dummy
      const balanceByCurrency = new TravelBalanceByCurrencyModel(
        group.currencyId,
        '$', // TODO: Obtener de currencies
        'Currency', // TODO: Obtener de currencies
        detailedBalances,
        simplifiedBalances,
      );

      balancesByCurrency.push(balanceByCurrency);
    }

    return balancesByCurrency;
  };

  private calculateDetailedBalances = async (
    travelId: number,
    currencyId: number
  ): Promise<TravelBalanceDetailModel[]> => {
    // Obtener todas las operaciones de esta moneda
    const allOperations = await this.travelOperationAccessService.getByTravelId(travelId);
    const operations = allOperations.filter(op => op.currencyId === currencyId && op.status === TravelOperationStatus.Approved);

    // Obtener todos los miembros del viaje
    const membersAccessModels = await this.travelMemberAccessService.getByTravelId(travelId);
    const members = await Promise.all(membersAccessModels.map(this.enrichTravelMemberModel));

    // Estructura para almacenar datos por miembro
    const memberData = new Map<number, {
      totalPaid: number;
      totalOwed: number;
      debtsTo: Map<number, number>; // memberId -> amount
    }>();

    // Inicializar estructura para cada miembro
    for (const member of members) {
      memberData.set(member.id, {
        totalPaid: 0,
        totalOwed: 0,
        debtsTo: new Map(),
      });
    }

    // Procesar cada operación
    for (const operation of operations) {
      const participants = await this.travelOperationParticipantAccessService.getByOperationId(operation.id);

      // El que pagó suma al totalPaid
      const payerData = memberData.get(operation.whoPaidMemberId);
      if (payerData) {
        payerData.totalPaid += operation.amount;
      }

      // Cada participante suma a su totalOwed
      for (const participant of participants) {
        const participantData = memberData.get(participant.travelMemberId);
        if (participantData) {
          participantData.totalOwed += participant.shareAmount;

          // Si el participante no es quien pagó, registrar deuda
          if (participant.travelMemberId !== operation.whoPaidMemberId) {
            const currentDebt = participantData.debtsTo.get(operation.whoPaidMemberId) || 0;
            participantData.debtsTo.set(operation.whoPaidMemberId, currentDebt + participant.shareAmount);
          }
        }
      }
    }

    // Construir modelos de balance detallado
    const detailedBalances: TravelBalanceDetailModel[] = [];

    for (const member of members) {
      const data = memberData.get(member.id);
      if (!data) continue;

      const balance = data.totalPaid - data.totalOwed;

      // Construir deudas (a quiénes debe)
      const debtsToOthers: DebtDetailModel[] = [];
      for (const [creditorId, amount] of data.debtsTo.entries()) {
        const creditor = members.find(m => m.id === creditorId);
        if (creditor && amount > 0) {
          debtsToOthers.push(new DebtDetailModel(
            creditorId,
            `${creditor.collaboratorName} ${creditor.collaboratorSurname}`,
            amount
          ));
        }
      }

      // Construir créditos (quiénes le deben)
      const creditsFromOthers: CreditDetailModel[] = [];
      for (const otherMember of members) {
        if (otherMember.id === member.id) continue;

        const otherData = memberData.get(otherMember.id);
        if (!otherData) continue;

        const debtToMe = otherData.debtsTo.get(member.id) || 0;
        if (debtToMe > 0) {
          creditsFromOthers.push(new CreditDetailModel(
            otherMember.id,
            `${otherMember.collaboratorName} ${otherMember.collaboratorSurname}`,
            debtToMe
          ));
        }
      }

      detailedBalances.push(new TravelBalanceDetailModel(
        member.id,
        `${member.collaboratorName} ${member.collaboratorSurname}`,
        data.totalPaid,
        data.totalOwed,
        balance,
        debtsToOthers,
        creditsFromOthers,
      ));
    }

    return detailedBalances;
  };

  private calculateSimplifiedBalances = (
    detailedBalances: TravelBalanceDetailModel[]
  ): TravelBalanceSimplifiedModel[] => {
    // Crear una lista de acreedores (balance positivo) y deudores (balance negativo)
    const creditors = detailedBalances.filter(x => x.balance > 0.01).map(x => ({
      memberId: x.memberId,
      memberName: x.memberName,
      remaining: x.balance,
    }));

    const debtors = detailedBalances.filter(x => x.balance < -0.01).map(x => ({
      memberId: x.memberId,
      memberName: x.memberName,
      remaining: Math.abs(x.balance),
    }));

    // Algoritmo de simplificación: emparejar deudores con acreedores
    const settlements: Map<number, SettlementModel[]> = new Map();

    // Inicializar settlements para cada miembro
    for (const balance of detailedBalances) {
      settlements.set(balance.memberId, []);
    }

    let debtorIndex = 0;
    let creditorIndex = 0;

    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const debtor = debtors[debtorIndex];
      const creditor = creditors[creditorIndex];

      const amount = Math.min(debtor.remaining, creditor.remaining);

      if (amount > 0.01) {
        // Agregar settlement para el deudor
        const debtorSettlements = settlements.get(debtor.memberId) || [];
        debtorSettlements.push(new SettlementModel(
          creditor.memberId,
          creditor.memberName,
          amount,
          'owes'
        ));
        settlements.set(debtor.memberId, debtorSettlements);

        // Agregar settlement para el acreedor
        const creditorSettlements = settlements.get(creditor.memberId) || [];
        creditorSettlements.push(new SettlementModel(
          debtor.memberId,
          debtor.memberName,
          amount,
          'receives'
        ));
        settlements.set(creditor.memberId, creditorSettlements);

        debtor.remaining -= amount;
        creditor.remaining -= amount;
      }

      if (debtor.remaining < 0.01) debtorIndex++;
      if (creditor.remaining < 0.01) creditorIndex++;
    }

    // Construir modelos simplificados
    const simplifiedBalances: TravelBalanceSimplifiedModel[] = [];
    for (const balance of detailedBalances) {
      const memberSettlements = settlements.get(balance.memberId) || [];
      simplifiedBalances.push(new TravelBalanceSimplifiedModel(
        balance.memberId,
        balance.memberName,
        memberSettlements,
      ));
    }

    return simplifiedBalances;
  };
}