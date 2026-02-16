import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { useLoadingStore, useTravelStore, useCollaboratorStore, useAuthStore } from '../../store';
import { AlertService, FormatterHelperService } from '../../services';
import { TravelMemberApiModel, TravelOperationApiModel } from '../../models/api/travels';
import { ApprovalStatus } from '../../models/enums';

@Component({
  selector: 'app-travel-detail',
  templateUrl: './travel-detail.component.html',
  styleUrls: ['./travel-detail.component.css'],
  imports: [CommonModule, RouterModule, TranslateModule]
})
export class TravelDetailComponent implements OnInit {
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
    this.travelStore.loadBalances(travelId);
  }

  protected setActiveTab(tab: 'members' | 'operations' | 'balances'): void {
    this.activeTab.set(tab);
  }

  protected backToList(): void {
    this.router.navigate(['/travels']);
  }

  protected editTravel(): void {
    if (this.travel()) {
      this.router.navigate(['/travels', this.travel()!.id, 'edit']);
    }
  }

  protected async finalizeTravel(): Promise<void> {
    const travel = this.travel();
    if (!travel) return;

    const result = await this.alertService.showQuestionModal(
      this.translate.instant('travels.finalizeTravelTitle'),
      this.translate.instant('travels.finalizeTravelMessage', { name: travel.name })
    );

    if (result.isConfirmed) {
      this.travelStore.finalizeTravel(travel.id);
      this.alertService.showSuccess(
        this.translate.instant('travels.travelFinalizedSuccess')
      );
    }
  }

  // ==================== MEMBERS ====================

  protected async addMember(collaboratorId: number): Promise<void> {
    if (!this.travelId) return;

    const collaborator = this.availableCollaborators().find(c => c.id === collaboratorId);
    if (!collaborator) return;

    const result = await this.alertService.showQuestionModal(
      this.translate.instant('travels.addMemberTitle'),
      this.translate.instant('travels.addMemberMessage', { 
        name: `${collaborator.name} ${collaborator.surname}` 
      })
    );

    if (result.isConfirmed) {
      this.travelStore.addMember(this.travelId, { collaboratorId }).subscribe({
        next: () => {
          this.alertService.showSuccess(
            this.translate.instant('travels.memberAddedSuccess')
          );
        },
        error: () => {
          this.alertService.showError(
            this.translate.instant('travels.memberAddedError')
          );
        }
      });
    }
  }

  protected async removeMember(member: TravelMemberApiModel): Promise<void> {
    const result = await this.alertService.showQuestionModal(
      this.translate.instant('travels.removeMemberTitle'),
      this.translate.instant('travels.removeMemberMessage', { 
        name: `${member.collaboratorName} ${member.collaboratorSurname}` 
      })
    );

    if (result.isConfirmed) {
      this.travelStore.removeMember(member.id);
      this.alertService.showSuccess(
        this.translate.instant('travels.memberRemovedSuccess')
      );
    }
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

  protected async approveOperation(operation: TravelOperationApiModel): Promise<void> {
    const result = await this.alertService.showQuestionModal(
      this.translate.instant('travels.approveOperationTitle'),
      this.translate.instant('travels.approveOperationMessage', { 
        description: operation.description 
      })
    );

    if (result.isConfirmed) {
      this.travelStore.approveOperation(operation.id);
      this.alertService.showSuccess(
        this.translate.instant('travels.operationApprovedSuccess')
      );
    }
  }

  protected async rejectOperation(operation: TravelOperationApiModel): Promise<void> {
    // Usar SweetAlert2 directamente para input
    const { default: Swal } = await import('sweetalert2');
    const result = await Swal.fire({
      title: this.translate.instant('travels.rejectOperationTitle'),
      text: this.translate.instant('travels.rejectOperationMessage'),
      input: 'textarea',
      inputPlaceholder: this.translate.instant('travels.rejectReasonPlaceholder'),
      inputAttributes: {
        'aria-label': this.translate.instant('travels.rejectReasonPlaceholder')
      },
      showCancelButton: true,
      confirmButtonText: this.translate.instant('travels.reject'),
      cancelButtonText: this.translate.instant('inputs.no'),
      reverseButtons: true,
      customClass: {
        cancelButton: 'btn btn-outline btn-primary mx-1',
        confirmButton: 'btn btn-error',
      },
      buttonsStyling: false,
      inputValidator: (value) => {
        if (!value) {
          return this.translate.instant('travels.rejectReasonRequired');
        }
        return null;
      }
    });

    if (result.isConfirmed && result.value) {
      this.travelStore.rejectOperation(operation.id, { rejectionReason: result.value }).subscribe({
        next: () => {
          this.alertService.showSuccess(
            this.translate.instant('travels.operationRejectedSuccess')
          );
        },
        error: () => {
          this.alertService.showError(
            this.translate.instant('travels.operationRejectedError')
          );
        }
      });
    }
  }

  protected async deleteOperation(operation: TravelOperationApiModel): Promise<void> {
    const result = await this.alertService.showQuestionModal(
      this.translate.instant('travels.deleteOperationTitle'),
      this.translate.instant('travels.deleteOperationMessage', { 
        description: operation.description 
      })
    );

    if (result.isConfirmed) {
      this.travelStore.deleteOperation(operation.id);
      this.alertService.showSuccess(
        this.translate.instant('travels.operationDeletedSuccess')
      );
    }
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

  private getCurrentUserMember(): TravelMemberApiModel | undefined {
    const members = this.members();
    return members.find(x => x.collaboratorId === this.authStore.collaboratorId());
  }

}