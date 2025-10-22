import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { CollaboratorApiModel } from '../../models/api';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { useCollaboratorStore, useLoadingStore } from '../../store';
import { AlertService, HelperService } from '../../services';
import { CollaboratorApiService } from '../../services/api/collaborator-api.service';
import { CollaboratorMatchRequestApiService } from '../../services/api/collaborator-match-request-api.service';

@Component({
  selector: 'app-collaborators',
  templateUrl: './collaborators.component.html',
  styleUrls: ['./collaborators.component.css'],
  imports: [
    CommonModule,
    RouterModule,
  ]
})
export class CollaboratorsComponent implements OnInit {
  private router = inject(Router);
  private alertService = inject(AlertService);
  private collaboratorApiService = inject(CollaboratorApiService);
  private matchRequestApiService = inject(CollaboratorMatchRequestApiService);

  private collaboratorStore = useCollaboratorStore();
  private loadingStore = useLoadingStore();

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


  ngOnInit(): void {
    this.loadCollaborators();
    this.loadPendingRequestsCount();
  }

  protected setFilter = (type: 'all' | 'unlinked' | 'linked'): void => {
    this.filterType.set(type);
  }

  protected getInitials(name: string, surname: string): string {
    return (name.charAt(0) + surname.charAt(0)).toUpperCase();
  }

  protected getFormattedDate = (date: Date): string => HelperService.getFormattedDate(date);

  protected editCollaborator(collaborator: CollaboratorApiModel): void {
    this.collaboratorStore.selectCollaborator(collaborator);
    this.router.navigate(['/collaborators/edit', collaborator.id]);
  }

  protected toggleCollaboratorStatus(collaborator: CollaboratorApiModel): void {
    const action = collaborator.isActive ? 'deactivate' : 'activate';
    const confirmMsg = `Are you sure you want to ${action} ${collaborator.name} ${collaborator.surname}?`;

    this.alertService.showQuestionModal('Change Visibility', confirmMsg).then(x => {
      if (x && x.isConfirmed) {
        this.collaboratorStore.changeVisibility(+collaborator.id)
        this.loadCollaborators();
        this.alertService.showSuccess(`Collaborator updated successfully`);
      }
    })
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

  protected resendInvitation(collaborator: CollaboratorApiModel): void {
    if (!collaborator.email) {
      this.alertService.showInfo('This collaborator has no email address');
      return;
    }

    this.collaboratorApiService.resendInvitation(collaborator.id).subscribe({
      next: (response) => {
        this.alertService.showSuccess(response.message);
      },
      error: (error) => {
        this.alertService.showError('Failed to resend invitation');
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
}