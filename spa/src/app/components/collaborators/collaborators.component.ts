import { Component, inject, OnInit, signal } from '@angular/core';
import { CollaboratorApiModel } from '../../models/api';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { useCollaboratorStore, useLoadingStore } from '../../store';
import { AlertService } from '../../services';
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

  protected collaborators: CollaboratorApiModel[] = [];
  protected isLoading = this.loadingStore.isLoading;
  protected filterType: 'all' | 'unlinked' | 'linked' = 'all';
  protected pendingRequestsCount = signal(0);

  ngOnInit(): void {
    this.loadCollaborators();
    this.loadPendingRequestsCount();
  }

  protected setFilter = (type: 'all' | 'unlinked' | 'linked'): void => {
    this.filterType = type;
    this.collaborators = this.getCollaborators();
  }

  protected getInitials(name: string, surname: string): string {
    return (name.charAt(0) + surname.charAt(0)).toUpperCase();
  }

  protected getFormattedDate(date: Date): string {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - new Date(date).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }

  protected editCollaborator(collaborator: CollaboratorApiModel): void {
    this.collaboratorStore.selectCollaborator(collaborator);
    this.router.navigate(['/collaborators/edit', collaborator.id]);
  }

  protected toggleCollaboratorStatus(collaborator: CollaboratorApiModel): void {
    const action = collaborator.isActive ? 'deactivate' : 'activate';
    const confirmMsg = `Are you sure you want to ${action} ${collaborator.name} ${collaborator.surname}?`;

    if (confirm(confirmMsg)) {
      this.collaboratorStore.changeVisibility(collaborator.id);
    }
  }

  protected deleteCollaborator(collaborator: CollaboratorApiModel): void {
    this.collaboratorApiService.canDeleteCollaborator(collaborator.id).subscribe({
      next: (response) => {
        if (!response.canDelete) {
          this.alertService.showInfo(
            response.reason || 'This collaborator cannot be deleted'
          );
          return;
        }

        const confirmMsg = `Are you sure you want to delete ${collaborator.name} ${collaborator.surname}?`;
        if (confirm(confirmMsg)) {
          this.alertService.showSuccess('Collaborator deleted successfully');
          this.loadCollaborators();
        }
      },
      error: (error) => {
        this.alertService.showError('Failed to check delete permission');
      }
    });
  }

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

  private getCollaborators = (): CollaboratorApiModel[] => {
    switch (this.filterType) {
      case 'unlinked':
        return this.collaboratorStore.unlinkedCollaborators();
      case 'linked':
        return this.collaboratorStore.linkedCollaborators();
      default:
        return this.collaboratorStore.allCollaborators();
    }
  }

  private loadCollaborators(): void {
    this.collaboratorStore.loadCollaborators();
    this.collaborators = this.getCollaborators();
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