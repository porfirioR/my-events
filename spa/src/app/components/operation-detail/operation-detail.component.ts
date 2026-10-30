import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, ViewChild, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { useTravelStore, useLoadingStore, useAuthStore, useCurrencyStore } from '../../store';
import { AlertService, BreadcrumbService, FormatterHelperService } from '../../services';
import { TravelMemberApiModel, TravelOperationApiModel } from '../../models/api/travels';
import { AttachmentListComponent } from '../attachment-list/attachment-list.component';
import { ApprovalStatus } from '../../models/enums';
import { ConfirmDialogComponent, ConfirmDialogResult } from '../confirm-dialog/confirm-dialog.component';
import { OperationChargeModalComponent } from '../operation-charge-modal/operation-charge-modal.component';

// paymentmethods: 1 Card, 2 Cash, 3 Bank
const CARD_PAYMENT_METHOD_ID = 1;
// Nombres de paymentmethods = claves de traducción
const PAYMENT_METHOD_LABELS: Record<number, string> = { 1: 'Card', 2: 'Cash', 3: 'Bank' };

@Component({
  selector: 'app-operation-detail',
  templateUrl: './operation-detail.component.html',
  styleUrls: ['./operation-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    AttachmentListComponent,
    ConfirmDialogComponent,
    OperationChargeModalComponent,
  ]
})
export class OperationDetailComponent implements OnInit {
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
  private loadingStore = useLoadingStore();
  private authStore = useAuthStore();
  private currencyStore = useCurrencyStore();

  protected isLoading = this.loadingStore.isLoading;
  protected travel = this.travelStore.selectedTravel;
  private breadcrumbService = inject(BreadcrumbService);
  // Muestra el nombre del viaje en el breadcrumb (en vez de "#id")
  private breadcrumbLabel = effect(() => {
    const travel = this.travel();
    if (travel) this.breadcrumbService.setLabel(`/travels/${travel.id}`, travel.name);
  });
  protected operation = signal<TravelOperationApiModel | null>(null);

  protected travelId?: number;
  protected operationId?: number;
  protected approvalStatus = ApprovalStatus;

  protected getFormattedDateCustom = this.formatterService.getFormattedDateCustom.bind(this.formatterService);
  protected formatCurrency = this.formatterService.formatCurrency;
  protected getInitials = FormatterHelperService.getInitials;


  ngOnInit(): void {
    this.travelStore.loadCategories()
    this.currencyStore.loadCurrencies();
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
    this.travelStore.loadMembers(this.travelId);
    this.travelStore.loadOperationById(this.operationId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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

  // Cobro de la tarjeta: solo operaciones con tarjeta, lo registra quien pagó o el creador del viaje
  protected canRegisterCharge(operation: TravelOperationApiModel): boolean {
    if (operation.paymentMethodId !== CARD_PAYMENT_METHOD_ID) return false;
    const travel = this.travel();
    if (travel && Number(travel.createdByUserId) === Number(this.authStore.userId())) return true;
    return this.getCurrentUserMember()?.id === operation.whoPaidMemberId;
  }

  protected openChargeModal(operation: TravelOperationApiModel): void {
    this.chargeModal.open(operation);
  }

  protected paymentMethodLabel = (paymentMethodId: number): string => PAYMENT_METHOD_LABELS[paymentMethodId] ?? '';

  // Cotización real del cobro: lo cobrado por cada unidad de la moneda de la operación
  protected chargeRate = (operation: TravelOperationApiModel): string =>
    this.formatCurrency(operation.chargedAmount! / operation.amount, operation.chargedCurrencyId!);

  protected editOperation(): void {
    if (this.travelId && this.operationId) {
      this.router.navigate(['/travels', this.travelId, 'operations', this.operationId, 'edit']);
    }
  }

  protected onConfirmResult(result: ConfirmDialogResult): void {
    this.pendingCallback?.(result);
    this.pendingCallback = null;
  }

  protected approveOperation(): void {
    const op = this.operation();
    if (!op) return;

    this.pendingCallback = (result) => {
      if (result.confirmed) {
        this.travelStore.approveOperation(op.id);
        this.alertService.showSuccess(this.translate.instant('travels.operationApprovedSuccess'));
        this.loadOperationDetail();
      }
    };
    this.confirmDialog.open({
      title: this.translate.instant('travels.approveOperationTitle'),
      message: this.translate.instant('travels.approveOperationMessage', { description: op.description })
    });
  }

  protected rejectOperation(): void {
    const op = this.operation();
    if (!op) return;

    this.pendingCallback = (result) => {
      if (result.confirmed && result.value) {
        this.travelStore.rejectOperation(op.id, { rejectionReason: result.value }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: () => {
            this.alertService.showSuccess(this.translate.instant('travels.operationRejectedSuccess'));
            this.loadOperationDetail();
          },
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

  protected deleteOperation(): void {
    const op = this.operation();
    if (!op) return;

    this.pendingCallback = (result) => {
      if (result.confirmed) {
        this.travelStore.deleteOperation(op.id);
        this.alertService.showSuccess(this.translate.instant('travels.operationDeletedSuccess'));
        this.router.navigate(['/travels', this.travelId]);
      }
    };
    this.confirmDialog.open({
      title: this.translate.instant('travels.deleteOperationTitle'),
      message: this.translate.instant('travels.deleteOperationMessage', { description: op.description }),
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
    return members.find(x => x.memberUserId === this.authStore.userId());
  }
}