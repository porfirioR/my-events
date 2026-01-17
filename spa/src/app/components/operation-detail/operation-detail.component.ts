import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { useTravelStore, useLoadingStore } from '../../store';
import { AlertService, FormatterHelperService } from '../../services';
import { TravelOperationApiModel } from '../../models/api/travels';

@Component({
  selector: 'app-operation-detail',
  templateUrl: './operation-detail.component.html',
  styleUrls: ['./operation-detail.component.css'],
  imports: [CommonModule, RouterModule, TranslateModule]
})
export class OperationDetailComponent implements OnInit {
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private alertService = inject(AlertService);
  private formatterService = inject(FormatterHelperService);
  private translate = inject(TranslateService);

  private travelStore = useTravelStore();
  private loadingStore = useLoadingStore();

  protected isLoading = this.loadingStore.isLoading;
  protected travel = this.travelStore.selectedTravel;
  protected operation = signal<TravelOperationApiModel | null>(null);

  protected travelId?: number;
  protected operationId?: number;

  protected getFormattedDate = this.formatterService.getFormattedDate.bind(this.formatterService);
  protected formatCurrency = this.formatterService.formatCurrency;

  ngOnInit(): void {
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
      case 'Pending':
        return 'badge-warning';
      case 'Approved':
        return 'badge-success';
      case 'Rejected':
        return 'badge-error';
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
}