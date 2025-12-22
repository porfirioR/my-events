import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CollaboratorApiModel } from '../../models/api';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { useCollaboratorStore, useLoadingStore } from '../../store';
import { AlertService, FormatterHelperService } from '../../services';
import { CollaboratorApiService } from '../../services/api/collaborator-api.service';
import { CollaboratorMatchRequestApiService } from '../../services/api/collaborator-match-request-api.service';

@Component({
  selector: 'app-collaborators',
  templateUrl: './collaborators.component.html',
  styleUrls: ['./collaborators.component.css'],
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule
  ]
})
export class CollaboratorsComponent implements OnInit {
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
  protected getFormattedDate = this.formatterService.getFormattedDate

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

  protected toggleCollaboratorStatus(collaborator: CollaboratorApiModel): void {
    const action = collaborator.isActive ? 
      this.translate.instant('collaborators.deactivate') : 
      this.translate.instant('collaborators.activate');
    
    const name = `${collaborator.name} ${collaborator.surname}`;
    const confirmMsg = collaborator.isActive ?
      this.translate.instant('collaborators.confirmDeactivate', { name }) :
      this.translate.instant('collaborators.confirmActivate', { name });

    this.alertService.showQuestionModal(
      this.translate.instant('collaborators.changeVisibility'), 
      confirmMsg
    ).then(x => {
      if (x && x.isConfirmed) {
        this.collaboratorStore.changeVisibility(+collaborator.id)
        this.loadCollaborators();
        this.alertService.showSuccess(
          this.translate.instant('collaborators.collaboratorUpdated')
        );
      }
    })
  }

  protected resendInvitation(collaborator: CollaboratorApiModel): void {
    if (!collaborator.email) {
      this.alertService.showInfo(
        this.translate.instant('collaborators.noEmailAddress')
      );
      return;
    }

    this.collaboratorApiService.resendInvitation(collaborator.id).subscribe({
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
    this.matchRequestApiService.getReceivedRequests().subscribe({
      next: (requests) => {
        this.pendingRequestsCount.set(requests.length);
      },
      error: (error) => {
        console.error('Failed to load pending requests count:', error);
        this.pendingRequestsCount.set(0);
      }
    });
  }

  // todo hard delete
  // protected deleteCollaborator(collaborator: CollaboratorApiModel): void {
  //   this.collaboratorApiService.canDeleteCollaborator(collaborator.id).subscribe({
  //     next: (response) => {
  //       if (!response.canDelete) {
  //         this.alertService.showInfo(
  //           response.reason || 'This collaborator cannot be deleted'
  //         );
  //         return;
  //       }
  //       this.loadingStore.setLoading()
  //       const confirmMsg = `Are you sure you want to Delete ${collaborator.name} ${collaborator.surname}?`;
  //       this.alertService.showQuestionModal('Delete', confirmMsg).then(x => {
  //         if (x && x.isConfirmed) {
  //           this.collaboratorStore.changeVisibility(+collaborator.id)
  //           this.loadCollaborators();
  //           this.alertService.showSuccess(`Collaborator ${status}d successfully`);
  //         }
  //       })
  //     },
  //     error: (error) => {
  //       this.alertService.showError('Failed to check delete permission');
  //     }
  //   });
  // }
}