import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { useTravelStore, useCollaboratorStore, useAuthStore, useCurrencyStore } from '../../store';
import { AlertService, BreadcrumbService, FormatterHelperService } from '../../services';
import { TravelMemberApiModel, TravelOperationApiModel } from '../../models/api/travels';
import { ApprovalStatus } from '../../models/enums';
import { DetailFieldViewModel } from '../../models/view';
import { ConfirmDialogComponent, ConfirmDialogResult } from '../confirm-dialog/confirm-dialog.component';
import { DetailStatCardsComponent } from '../detail-stat-cards/detail-stat-cards.component';
import { DetailInfoGridComponent } from '../detail-info-grid/detail-info-grid.component';
import { OperationChargeModalComponent } from '../operation-charge-modal/operation-charge-modal.component';

// paymentmethods: 1 Card, 2 Cash, 3 Bank
const CARD_PAYMENT_METHOD_ID = 1;

@Component({
  selector: 'app-travel-detail',
  templateUrl: './travel-detail.component.html',
  styleUrls: ['./travel-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, TranslateModule, ConfirmDialogComponent, DetailStatCardsComponent, DetailInfoGridComponent, OperationChargeModalComponent]
})
export class TravelDetailComponent implements OnInit {
  @ViewChild(ConfirmDialogComponent) confirmDialog!: ConfirmDialogComponent;
  @ViewChild(OperationChargeModalComponent) chargeModal!: OperationChargeModalComponent;
  private pendingCallback: ((result: ConfirmDialogResult) => void) | null = null;

  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private alertService = inject(AlertService);
  private formatterService = inject(FormatterHelperService);
  private translate = inject(TranslateService);

  private travelStore = useTravelStore();
  private collaboratorStore = useCollaboratorStore();
  private authStore = useAuthStore();
  private currencyStore = useCurrencyStore();

  // Flags del store por sección y no el loading global (otros pedidos lo apagan antes de tiempo)
  protected isOperationsLoading = this.travelStore.needsLoadingOperations;
  protected isMembersLoading = this.travelStore.needsLoadingMembers;
  protected isBalancesLoading = this.travelStore.needsLoadingBalances;
  protected travel = this.travelStore.selectedTravel;
  private breadcrumbService = inject(BreadcrumbService);
  // Muestra el nombre del viaje en el breadcrumb (en vez de "#id")
  private breadcrumbLabel = effect(() => {
    const travel = this.travel();
    if (travel) this.breadcrumbService.setLabel(`/travels/${travel.id}`, travel.name);
  });
  protected members = this.travelStore.members;
  protected operations = this.travelStore.sortedOperations;
  protected balances = this.travelStore.balances;
  protected approvalStatus = ApprovalStatus;

  protected activeTab = signal<'members' | 'operations' | 'balances'>('operations');
  protected travelId?: number;

  protected getFormattedDate = this.formatterService.getFormattedDate.bind(this.formatterService);
  protected getFormattedDateCustom = this.formatterService.getFormattedDateCustom.bind(this.formatterService);
  protected formatCurrency = this.formatterService.formatCurrency;
  protected getInitials = FormatterHelperService.getInitials;

  // Nombre de la moneda traducido (currencies.<id>); si no hay traducción, el de la base
  protected currencyLabel = (currencyId: number, fallback: string): string => {
    const key = `currencies.${currencyId}`;
    const translated = this.translate.instant(key);
    return translated !== key ? translated : fallback;
  };

  // Computed para colaboradores disponibles (no son miembros todavía)
  protected availableCollaborators = computed(() => {
    const allCollaborators = this.collaboratorStore.linkedCollaborators();
    const currentMembers = this.members();
    const memberCollaboratorIds = currentMembers.map(m => m.collaboratorId);

    return allCollaborators.filter(c => !memberCollaboratorIds.includes(c.id));
  });

  // Editar el viaje es solo del creador (lo valida el backend)
  protected isCreator = computed(() => {
    const travel = this.travel();
    return !!travel && Number(travel.createdByUserId) === Number(this.authStore.userId());
  });

  // Resumen (mismos bloques que en préstamos y ahorros)
  protected statCards = computed<DetailFieldViewModel[]>(() => {
    const operations = this.operations();
    const count = (status: string) => String(operations.filter(o => o.status === status).length);
    return [
      new DetailFieldViewModel('travels.operations', String(operations.length)),
      new DetailFieldViewModel('travels.approvedOperations', count(ApprovalStatus.Approved), 'text-success'),
      new DetailFieldViewModel('travels.pendingOperations', count(ApprovalStatus.Pending), 'text-warning'),
      new DetailFieldViewModel('travels.members', String(this.members().length)),
    ];
  });

  protected infoFields = computed<DetailFieldViewModel[]>(() => {
    const travel = this.travel();
    if (!travel) return [];
    const fields: DetailFieldViewModel[] = [];
    if (travel.startDate) fields.push(new DetailFieldViewModel('travels.startDate', this.getFormattedDateCustom(travel.startDate)));
    if (travel.endDate) fields.push(new DetailFieldViewModel('travels.endDate', this.getFormattedDateCustom(travel.endDate)));
    fields.push(new DetailFieldViewModel('travels.created', this.getFormattedDateCustom(travel.dateCreated)));
    if (travel.finalizedDate) {
      fields.push(new DetailFieldViewModel('travels.finalizedDate', this.getFormattedDateCustom(travel.finalizedDate), 'text-info'));
    }
    // Solo lo aprobado: lo pendiente todavía no está confirmado y lo rechazado no cuenta.
    // Un campo con todas las monedas (no se suman entre sí)
    const totals = new Map<number, number>();
    for (const operation of this.operations()) {
      if (operation.status !== ApprovalStatus.Approved) continue;
      totals.set(operation.currencyId, (totals.get(operation.currencyId) ?? 0) + operation.amount);
    }
    if (totals.size > 0) {
      const value = [...totals].map(([currencyId, total]) => this.formatCurrency(total, currencyId)).join(' · ');
      fields.push(new DetailFieldViewModel('travels.totalSpent', value));
    }
    // Lo que cobró el banco por los gastos con tarjeta en otra moneda (informativo)
    const charged = new Map<number, number>();
    for (const operation of this.operations()) {
      if (!operation.chargedAmount || !operation.chargedCurrencyId || operation.status === ApprovalStatus.Rejected) continue;
      charged.set(operation.chargedCurrencyId, (charged.get(operation.chargedCurrencyId) ?? 0) + operation.chargedAmount);
    }
    if (charged.size > 0) {
      const value = [...charged].map(([currencyId, total]) => this.formatCurrency(total, currencyId)).join(' · ');
      fields.push(new DetailFieldViewModel('travels.totalCharged', value, 'text-info'));
    }
    return fields;
  });

  // Cuántas operaciones pagó cada miembro
  protected paidCountByMember = computed(() => {
    const counts = new Map<number, number>();
    for (const operation of this.operations()) {
      counts.set(operation.whoPaidMemberId, (counts.get(operation.whoPaidMemberId) ?? 0) + 1);
    }
    return counts;
  });

  // Cada deuda viene dos veces (quien debe y quien recibe): se muestra una sola vez como transferencia
  protected settlementsByCurrency = computed(() =>
    this.balances().map(currencyBalance => ({
      currencyId: currencyBalance.currencyId,
      currencyName: currencyBalance.currencyName,
      currencySymbol: currencyBalance.currencySymbol,
      transfers: currencyBalance.simplifiedBalances.flatMap(balance =>
        balance.settlements
          .filter(settlement => settlement.direction === 'owes')
          .map(settlement => ({ from: balance.memberName, to: settlement.otherMemberName, amount: settlement.amount }))
      ),
    }))
  );

  ngOnInit(): void {
    this.travelStore.loadCategories()
    const id = this.activatedRoute.snapshot.params['id'];
    if (id) {
      this.travelId = +id;
      this.loadTravelData(this.travelId);
    }

    // Cargar colaboradores para poder agregar miembros
    this.collaboratorStore.loadCollaborators();
    this.currencyStore.loadCurrencies();
  }

  private loadTravelData(travelId: number): void {
    this.travelStore.loadTravelById(travelId);
    this.travelStore.loadMembers(travelId);
    this.travelStore.loadOperations(travelId);
  }

  protected setActiveTab(tab: 'members' | 'operations' | 'balances'): void {
    this.activeTab.set(tab);

    if (tab === 'balances' && this.travelId) {
      this.travelStore.loadBalances(this.travelId);
    } else if (tab === 'operations' && this.travelId) {
      this.travelStore.loadOperations(this.travelId);
    } else if (tab === 'members' && this.travelId) {
      this.travelStore.loadMembers(this.travelId);
    }
  }

  protected backToList(): void {
    this.router.navigate(['/travels']);
  }

  protected editTravel(): void {
    if (this.travel()) {
      this.router.navigate(['/travels', this.travel()!.id, 'edit']);
    }
  }

  // ==================== MEMBERS ====================

  protected onConfirmResult(result: ConfirmDialogResult): void {
    this.pendingCallback?.(result);
    this.pendingCallback = null;
  }

  protected addMember(collaboratorId: number): void {
    if (!this.travelId) return;

    const collaborator = this.availableCollaborators().find(c => c.id === collaboratorId);
    if (!collaborator) return;

    this.pendingCallback = (result) => {
      if (result.confirmed) {
        this.travelStore.addMember(this.travelId!, { collaboratorId }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: () => this.alertService.showSuccess(this.translate.instant('travels.memberAddedSuccess')),
          error: () => this.alertService.showError(this.translate.instant('travels.memberAddedError'))
        });
      }
    };
    this.confirmDialog.open({
      title: this.translate.instant('travels.addMemberTitle'),
      message: this.translate.instant('travels.addMemberMessage', { name: `${collaborator.name} ${collaborator.surname}` })
    });
  }

  protected removeMember(member: TravelMemberApiModel): void {
    this.pendingCallback = (result) => {
      if (result.confirmed) {
        this.travelStore.removeMember(member.id);
        this.alertService.showSuccess(this.translate.instant('travels.memberRemovedSuccess'));
      }
    };
    this.confirmDialog.open({
      title: this.translate.instant('travels.removeMemberTitle'),
      message: this.translate.instant('travels.removeMemberMessage', { name: `${member.collaboratorName} ${member.collaboratorSurname}` }),
      type: 'warning'
    });
  }

  // ==================== OPERATIONS ====================

  protected createOperation(): void {
    if (this.travelId) {
      this.router.navigate(['/travels', this.travelId, 'operations', 'create']);
    }
  }

  protected viewOperationDetail(operation: TravelOperationApiModel): void {
    if (this.travelId) {
      this.router.navigate(['/travels', this.travelId, 'operations', operation.id]);
    }
  }

  protected editOperation(operation: TravelOperationApiModel): void {
    if (this.travelId) {
      this.router.navigate(['/travels', this.travelId, 'operations', operation.id, 'edit']);
    }
  }

  protected approveOperation(operation: TravelOperationApiModel): void {
    this.pendingCallback = (result) => {
      if (result.confirmed) {
        this.travelStore.approveOperation(operation.id);
        this.alertService.showSuccess(this.translate.instant('travels.operationApprovedSuccess'));
      }
    };
    this.confirmDialog.open({
      title: this.translate.instant('travels.approveOperationTitle'),
      message: this.translate.instant('travels.approveOperationMessage', { description: operation.description })
    });
  }

  protected rejectOperation(operation: TravelOperationApiModel): void {
    this.pendingCallback = (result) => {
      if (result.confirmed && result.value) {
        this.travelStore.rejectOperation(operation.id, { rejectionReason: result.value }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: () => this.alertService.showSuccess(this.translate.instant('travels.operationRejectedSuccess')),
          error: () => this.alertService.showError(this.translate.instant('travels.operationRejectedError'))
        });
      }
    };
    this.confirmDialog.open({
      title: this.translate.instant('travels.rejectOperationTitle'),
      message: this.translate.instant('travels.rejectOperationMessage'),
      type: 'error',
      confirmLabel: this.translate.instant('travels.reject'),
      inputLabel: this.translate.instant('travels.rejectReasonPlaceholder'),
      inputPlaceholder: this.translate.instant('travels.rejectReasonPlaceholder'),
      inputRequired: true
    });
  }

  // Cobro de la tarjeta: solo operaciones con tarjeta, lo registra quien pagó o el creador
  protected canRegisterCharge(operation: TravelOperationApiModel): boolean {
    if (operation.paymentMethodId !== CARD_PAYMENT_METHOD_ID) return false;
    if (this.isCreator()) return true;
    return this.getCurrentUserMember()?.id === operation.whoPaidMemberId;
  }

  protected openChargeModal(operation: TravelOperationApiModel): void {
    this.chargeModal.open(operation);
  }

  protected deleteOperation(operation: TravelOperationApiModel): void {
    this.pendingCallback = (result) => {
      if (result.confirmed) {
        this.travelStore.deleteOperation(operation.id);
        this.alertService.showSuccess(this.translate.instant('travels.operationDeletedSuccess'));
      }
    };
    this.confirmDialog.open({
      title: this.translate.instant('travels.deleteOperationTitle'),
      message: this.translate.instant('travels.deleteOperationMessage', { description: operation.description }),
      type: 'error'
    });
  }

  protected getOperationStatusBadgeClass(status: string): string {
    switch(status) {
      case this.approvalStatus.Pending:   return 'badge-soft badge-warning';
      case this.approvalStatus.Approved:  return 'badge-soft badge-success';
      case this.approvalStatus.Rejected:  return 'badge-soft badge-error';
      default:                            return 'badge-soft badge-neutral';
    }
  }

  protected getOperationStatusIcon(status: string): string {
    switch(status) {
      case 'Pending':
        return 'fa-clock';
      case 'Approved':
        return 'fa-check-circle';
      case 'Rejected':
        return 'fa-times-circle';
      default:
        return 'fa-question-circle';
    }
  }

  protected getTravelStatusBadgeClass(status: string): string {
    switch(status) {
      case 'Active':    return 'badge-soft badge-success';
      case 'Finalized': return 'badge-soft badge-info';
      default:          return 'badge-soft badge-neutral';
    }
  }

  protected getTravelStatusIcon(status: string): string {
    switch(status) {
      case 'Active':
        return 'fa-plane-departure';
      case 'Finalized':
        return 'fa-check-circle';
      default:
        return 'fa-question-circle';
    }
  }

  protected hasCurrentUserApproved(operation: TravelOperationApiModel): boolean {
    if (!operation.participants) return false;

    const currentUserMember = this.getCurrentUserMember();
    if (!currentUserMember) return false;

    const userParticipant = operation.participants.find(
      x => x.memberId === currentUserMember.id
    );

    return userParticipant?.approvalStatus === this.approvalStatus.Approved;
  }

  protected canCurrentUserApprove(operation: TravelOperationApiModel): boolean {
    if (!operation.participants) return false;

    const currentUserMember = this.getCurrentUserMember();
    if (!currentUserMember) return false;

    const userParticipant = operation.participants.find(
      x => x.memberId === currentUserMember.id
    );

    if (!userParticipant) return false;

    return userParticipant.approvalStatus === this.approvalStatus.Pending;
  }

  protected canCurrentUserReject(operation: TravelOperationApiModel): boolean {
    if (!operation.participants) return false;

    const currentUserMember = this.getCurrentUserMember();
    if (!currentUserMember) return false;

    const userParticipant = operation.participants.find(
      x => x.memberId === currentUserMember.id
    );

    if (!userParticipant) return false;

    return userParticipant.approvalStatus === this.approvalStatus.Pending || 
          userParticipant.approvalStatus === this.approvalStatus.Approved;
  }

  protected selectedCategory = (id: number) => 
    this.travelStore.getCategoryById()(id)
  ;

  private getCurrentUserMember(): TravelMemberApiModel | undefined {
    const members = this.members();
    return members.find(x => x.memberUserId === this.authStore.userId());
  }

}