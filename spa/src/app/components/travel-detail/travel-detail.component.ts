import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { useLoadingStore, useTravelStore, useCollaboratorStore, useAuthStore } from '../../store';
import { AlertService, FormatterHelperService } from '../../services';
import { TravelMemberApiModel, TravelOperationApiModel } from '../../models/api/travels';
import { ApprovalStatus } from '../../models/enums';
import { ConfirmDialogComponent, ConfirmDialogResult } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-travel-detail',
  templateUrl: './travel-detail.component.html',
  styleUrls: ['./travel-detail.component.css'],
  imports: [CommonModule, RouterModule, TranslateModule, ConfirmDialogComponent]
})
export class TravelDetailComponent implements OnInit {
  @ViewChild(ConfirmDialogComponent) confirmDialog!: ConfirmDialogComponent;
  private pendingCallback: ((result: ConfirmDialogResult) => void) | null = null;

  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private alertService = inject(AlertService);
  private formatterService = inject(FormatterHelperService);
  private translate = inject(TranslateService);

  private travelStore = useTravelStore();
  private collaboratorStore = useCollaboratorStore();
  private loadingStore = useLoadingStore();
  private authStore = useAuthStore();

  protected isLoading = this.loadingStore.isLoading;
  protected travel = this.travelStore.selectedTravel;
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

  // Computed para colaboradores disponibles (no son miembros todavía)
  protected availableCollaborators = computed(() => {
    const allCollaborators = this.collaboratorStore.linkedCollaborators();
    const currentMembers = this.members();
    const memberCollaboratorIds = currentMembers.map(m => m.collaboratorId);

    return allCollaborators.filter(c => !memberCollaboratorIds.includes(c.id));
  });

  ngOnInit(): void {
    this.travelStore.loadCategories()
    const id = this.activatedRoute.snapshot.params['id'];
    if (id) {
      this.travelId = +id;
      this.loadTravelData(this.travelId);
    }

    // Cargar colaboradores para poder agregar miembros
    this.collaboratorStore.loadCollaborators();
  }

  private loadTravelData(travelId: number): void {
    this.travelStore.loadTravelById(travelId);
    this.travelStore.loadMembers(travelId);
    this.travelStore.loadOperations(travelId);
  }

  protected setActiveTab(tab: 'members' | 'operations' | 'balances'): void {
    this.activeTab.set(tab);

    if (tab === 'balances' && this.travelId) {
      console.log('🔄 Refreshing balances for travel:', this.travelId);
      this.travelStore.loadBalances(this.travelId);
    } else if (tab === 'operations' && this.travelId) {
      console.log('🔄 Refreshing operations for travel:', this.travelId);
      this.travelStore.loadOperations(this.travelId);
    } else if (tab === 'members' && this.travelId) {
      console.log('🔄 Refreshing members for travel:', this.travelId);
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
        this.travelStore.addMember(this.travelId!, { collaboratorId }).subscribe({
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
        this.travelStore.rejectOperation(operation.id, { rejectionReason: result.value }).subscribe({
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
      case this.approvalStatus.Pending:
        return 'bg-warning/20 text-warning border-warning/30 dark:border-0';
      case this.approvalStatus.Approved:
        return 'bg-success/20 text-success border-success/30 dark:border-0';
      case this.approvalStatus.Rejected:
        return 'bg-error/20 text-error border-error/30 dark:border-0';
      default:
        return 'badge-neutral';
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
      case 'Active':
        return 'badge-success';
      case 'Finalized':
        return 'badge-info';
      default:
        return 'badge-neutral';
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
    return members.find(x => x.collaboratorId === this.authStore.collaboratorId());
  }

}