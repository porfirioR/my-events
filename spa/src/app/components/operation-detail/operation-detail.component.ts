import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { useTravelStore, useLoadingStore, useAuthStore } from '../../store';
import { AlertService, FormatterHelperService } from '../../services';
import { TravelMemberApiModel, TravelOperationApiModel } from '../../models/api/travels';
import { AttachmentListComponent } from '../attachment-list/attachment-list.component';
import { ApprovalStatus } from '../../models/enums';

@Component({
  selector: 'app-operation-detail',
  templateUrl: './operation-detail.component.html',
  styleUrls: ['./operation-detail.component.css'],
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    AttachmentListComponent
  ]
})
export class OperationDetailComponent implements OnInit {
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private alertService = inject(AlertService);
  private formatterService = inject(FormatterHelperService);
  private translate = inject(TranslateService);

  private travelStore = useTravelStore();
  private loadingStore = useLoadingStore();
  private authStore = useAuthStore();

  protected isLoading = this.loadingStore.isLoading;
  protected travel = this.travelStore.selectedTravel;
  protected operation = signal<TravelOperationApiModel | null>(null);

  protected travelId?: number;
  protected operationId?: number;
  protected approvalStatus = ApprovalStatus;

  protected getFormattedDateCustom = this.formatterService.getFormattedDateCustom.bind(this.formatterService);
  protected formatCurrency = this.formatterService.formatCurrency;
  protected getInitials = FormatterHelperService.getInitials;


  ngOnInit(): void {
    this.travelStore.loadCategories()
    const travelId = this.activatedRoute.snapshot.params['travelId'];
    const operationId = this.activatedRoute.snapshot.params['operationId'];

    if (travelId && operationId) {
      this.travelId = +travelId;
      this.operationId = +operationId;

      this.loadOperationDetail();
    }
  }

  private loadOperationDetail(): void {
    if (!this.travelId || !this.operationId) return;

    this.travelStore.loadTravelById(this.travelId);
    this.travelStore.loadOperationById(this.operationId).subscribe({
      next: (operation) => {
        this.operation.set(operation);
        this.travelStore.getCategoryById()(operation.id)
      },
      error: () => {
        this.alertService.showError(
          this.translate.instant('operations.operationNotFound')
        );
        this.router.navigate(['/travels', this.travelId]);
      }
    });
  }

  protected backToTravel(): void {
    if (this.travelId) {
      this.router.navigate(['/travels', this.travelId]);
    } else {
      this.router.navigate(['/travels']);
    }
  }

  protected editOperation(): void {
    if (this.travelId && this.operationId) {
      this.router.navigate(['/travels', this.travelId, 'operations', this.operationId, 'edit']);
    }
  }

  protected async approveOperation(): Promise<void> {
    const op = this.operation();
    if (!op) return;

    const result = await this.alertService.showQuestionModal(
      this.translate.instant('travels.approveOperationTitle'),
      this.translate.instant('travels.approveOperationMessage', { description: op.description })
    );

    if (result.isConfirmed) {
      this.travelStore.approveOperation(op.id);
      this.alertService.showSuccess(
        this.translate.instant('travels.operationApprovedSuccess')
      );
      this.loadOperationDetail();
    }
  }

  protected async rejectOperation(): Promise<void> {
    const op = this.operation();
    if (!op) return;

    const { default: Swal } = await import('sweetalert2');
    const result = await Swal.fire({
      title: this.translate.instant('travels.rejectOperationTitle'),
      text: this.translate.instant('travels.rejectOperationMessage'),
      input: 'textarea',
      inputPlaceholder: this.translate.instant('travels.rejectReasonPlaceholder'),
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
      this.travelStore.rejectOperation(op.id, { rejectionReason: result.value }).subscribe({
        next: () => {
          this.alertService.showSuccess(
            this.translate.instant('travels.operationRejectedSuccess')
          );
          this.loadOperationDetail();
        },
        error: () => {
          this.alertService.showError(
            this.translate.instant('travels.operationRejectedError')
          );
        }
      });
    }
  }

  protected async deleteOperation(): Promise<void> {
    const op = this.operation();
    if (!op) return;

    const result = await this.alertService.showQuestionModal(
      this.translate.instant('travels.deleteOperationTitle'),
      this.translate.instant('travels.deleteOperationMessage', { description: op.description })
    );

    if (result.isConfirmed) {
      this.travelStore.deleteOperation(op.id);
      this.alertService.showSuccess(
        this.translate.instant('travels.operationDeletedSuccess')
      );
      this.router.navigate(['/travels', this.travelId]);
    }
  }

  protected getOperationStatusBadgeClass(status: string): string {
    switch(status) {
      case this.approvalStatus.Pending:
        return 'badge-warning';
      case this.approvalStatus.Approved:
        return 'badge-success';
      case this.approvalStatus.Rejected:
        return 'badge-error';
      default:
        return 'badge-neutral';
    }
  }

  protected getOperationStatusIcon(status: string): string {
    switch(status) {
      case this.approvalStatus.Pending:
        return 'fa-clock';
      case this.approvalStatus.Approved:
        return 'fa-check-circle';
      case this.approvalStatus.Rejected:
        return 'fa-times-circle';
      default:
        return 'fa-question-circle';
    }
  }

  // Método para verificar si el usuario actual ya aprobó
  protected hasCurrentUserApproved(operation: TravelOperationApiModel): boolean {
    if (!operation.participants) return false;

    // Necesitamos obtener el miembro actual del usuario en este viaje
    const currentUserMember = this.getCurrentUserMember();
    if (!currentUserMember) return false;

    // Buscar si el usuario actual está en los participantes y ya aprobó
    const userParticipant = operation.participants.find(
      x => x.memberId === currentUserMember.id
    );

    return userParticipant?.approvalStatus === this.approvalStatus.Approved;
  }

  protected selectedCategory = () => 
    this.travelStore.getCategoryById()(this.operationId)
  ;


  // Método para verificar si el usuario puede aprobar
  protected canCurrentUserApprove(operation: TravelOperationApiModel): boolean {
    if (!operation.participants) return false;

    const currentUserMember = this.getCurrentUserMember();
    if (!currentUserMember) return false;

    // Verificar que es participante
    const userParticipant = operation.participants.find(
      x => x.memberId === currentUserMember.id
    );

    if (!userParticipant) return false;

    // Solo puede aprobar si está pendiente
    return userParticipant.approvalStatus === this.approvalStatus.Pending;
  }

  // Método para verificar si el usuario puede rechazar
  protected canCurrentUserReject(operation: TravelOperationApiModel): boolean {
    if (!operation.participants) return false;

    const currentUserMember = this.getCurrentUserMember();
    if (!currentUserMember) return false;

    // Verificar que es participante
    const userParticipant = operation.participants.find(x => x.memberId === currentUserMember.id);

    if (!userParticipant) return false;

    // Solo puede rechazar si está pendiente o ya aprobó
    return userParticipant.approvalStatus === this.approvalStatus.Pending || 
          userParticipant.approvalStatus === this.approvalStatus.Approved;
  }

  // Método para obtener el miembro actual del usuario en el viaje
  private getCurrentUserMember(): TravelMemberApiModel | undefined {
    const members = this.travelStore.members();
    return members.find(x => x.collaboratorId === this.authStore.collaboratorId());
  }
}