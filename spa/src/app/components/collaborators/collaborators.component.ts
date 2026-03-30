import { ChangeDetectionStrategy, Component, DestroyRef, ViewChild, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CollaboratorApiModel } from '../../models/api';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { useCollaboratorStore, useLoadingStore } from '../../store';
import { AlertService, FormatterHelperService } from '../../services';
import { CollaboratorApiService } from '../../services/api/collaborator-api.service';
import { CollaboratorMatchRequestApiService } from '../../services/api/collaborator-match-request-api.service';
import { ConfirmDialogComponent, ConfirmDialogResult } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-collaborators',
  templateUrl: './collaborators.component.html',
  styleUrls: ['./collaborators.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    ConfirmDialogComponent
  ]
})
export class CollaboratorsComponent implements OnInit {
  @ViewChild(ConfirmDialogComponent) confirmDialog!: ConfirmDialogComponent;
  private pendingCallback: ((result: ConfirmDialogResult) => void) | null = null;

  private destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly alertService = inject(AlertService);
  private readonly translate = inject(TranslateService);  // ← Inyectar
  private readonly collaboratorApiService = inject(CollaboratorApiService);
  private readonly matchRequestApiService = inject(CollaboratorMatchRequestApiService);
  private collaboratorStore = useCollaboratorStore();
  private loadingStore = useLoadingStore();
  private formatterService = inject(FormatterHelperService);
  protected collaborators = computed(() => {
    switch (this.filterType()) {
      case 'unlinked':
        return this.collaboratorStore.unlinkedCollaborators();
      case 'linked':
        return this.collaboratorStore.linkedCollaborators();
      default:
        return this.collaboratorStore.allCollaborators();
    }
  })
  protected isLoading = this.loadingStore.isLoading;
  protected filterType = signal<'all' | 'unlinked' | 'linked'>('all');
  protected pendingRequestsCount = signal(0);
  protected getInitials = FormatterHelperService.getInitials
  protected getFormattedDate = this.formatterService.getFormattedDate.bind(this.formatterService)

  ngOnInit(): void {
    this.loadCollaborators();
    this.loadPendingRequestsCount();
  }

  protected setFilter = (type: 'all' | 'unlinked' | 'linked'): void => {
    this.filterType.set(type);
  }

  protected editCollaborator(collaborator: CollaboratorApiModel): void {
    this.collaboratorStore.selectCollaborator(collaborator);
    this.router.navigate(['/collaborators/edit', collaborator.id]);
  }

  protected onConfirmResult(result: ConfirmDialogResult): void {
    this.pendingCallback?.(result);
    this.pendingCallback = null;
  }

  protected toggleCollaboratorStatus(collaborator: CollaboratorApiModel): void {
    const name = `${collaborator.name} ${collaborator.surname}`;
    const confirmMsg = collaborator.isActive ?
      this.translate.instant('collaborators.confirmDeactivate', { name }) :
      this.translate.instant('collaborators.confirmActivate', { name });

    this.pendingCallback = (result) => {
      if (result.confirmed) {
        this.collaboratorStore.changeVisibility(+collaborator.id);
        this.loadCollaborators();
        this.alertService.showSuccess(this.translate.instant('collaborators.collaboratorUpdated'));
      }
    };
    this.confirmDialog.open({
      title: this.translate.instant('collaborators.changeVisibility'),
      message: confirmMsg,
      type: 'warning'
    });
  }

  protected resendInvitation(collaborator: CollaboratorApiModel): void {
    if (!collaborator.email) {
      this.alertService.showInfo(
        this.translate.instant('collaborators.noEmailAddress')
      );
      return;
    }

    this.collaboratorApiService.resendInvitation(collaborator.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.alertService.showSuccess(
          response.message || this.translate.instant('collaborators.invitationResent')
        );
      },
      error: () => {
        this.alertService.showError(
          this.translate.instant('collaborators.failedToResend')
        );
      }
    });
  }

  protected sendMatchRequest(collaborator: CollaboratorApiModel): void {
    this.collaboratorStore.selectCollaborator(collaborator);
    this.router.navigate(['/collaborators/match-requests'], { 
      queryParams: {
        collaboratorId: collaborator.id,
        tab: 'create'
      }
    });
  }

  protected create(): void {
    this.collaboratorStore.clearSelectedCollaborator();
    this.router.navigate(['/collaborators/create']);
  }

  protected viewMatchRequests(): void {
    this.router.navigate(['/collaborators/match-requests']);
  }

  private loadCollaborators(): void {
    this.loadingStore.setLoading();
    this.collaboratorStore.loadCollaborators();
  }

  private loadPendingRequestsCount(): void {
    this.matchRequestApiService.getReceivedRequests().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (requests) => {
        this.pendingRequestsCount.set(requests.length);
      },
      error: (error) => {
        console.error('Failed to load pending requests count:', error);
        this.pendingRequestsCount.set(0);
      }
    });
  }

  protected deleteCollaborator(collaborator: CollaboratorApiModel): void {
    this.collaboratorApiService.canDeleteCollaborator(collaborator.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (!response.canDelete) {
          this.alertService.showError(this.translate.instant(response.reason || 'collaborators.deleteError'));
          return;
        }

        this.pendingCallback = (result) => {
          if (result.confirmed) {
            this.collaboratorStore.deleteCollaborator(collaborator.id);
            this.alertService.showSuccess(this.translate.instant('collaborators.deletedSuccess'));
          }
        };
        this.confirmDialog.open({
          title: this.translate.instant('collaborators.deleteConfirmTitle'),
          message: this.translate.instant('collaborators.deleteConfirmMessage', { name: `${collaborator.name} ${collaborator.surname}` }),
          type: 'error'
        });
      },
      error: () => {
        this.alertService.showError(this.translate.instant('collaborators.deleteError'));
      }
    });
  }
}