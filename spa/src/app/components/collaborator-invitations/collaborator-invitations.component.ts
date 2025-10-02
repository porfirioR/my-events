import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { 
  CollaboratorInvitationModel, 
  ReceivedMatchRequestModel,
  CollaboratorApiModel
} from '../../models/api/collaborators';
import { CollaboratorInvitationApiService } from '../../services/api/collaborator-invitation-api.service';
import { CollaboratorApiService } from '../../services/api/collaborator-api.service';
import { AlertService } from '../../services';
import { useLoadingStore } from '../../store';

@Component({
  selector: 'app-collaborator-invitations',
  standalone: true,
  templateUrl: './collaborator-invitations.component.html',
  styleUrls: ['./collaborator-invitations.component.css'],
  imports: [CommonModule, RouterModule]
})
export class CollaboratorInvitationsComponent implements OnInit {
  private invitationApiService = inject(CollaboratorInvitationApiService);
  private collaboratorApiService = inject(CollaboratorApiService);
  private alertService = inject(AlertService);
  private loadingStore = useLoadingStore();
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  invitationsSummary: CollaboratorInvitationModel[] = [];
  selectedCollaboratorInvitations: ReceivedMatchRequestModel[] = [];
  selectedCollaborator: CollaboratorApiModel | null = null;
  
  viewMode: 'summary' | 'details' = 'summary';
  isLoading = this.loadingStore.isLoading;

  ngOnInit(): void {
    const collaboratorId = this.route.snapshot.paramMap.get('collaboratorId');
    
    if (collaboratorId) {
      this.viewMode = 'details';
      this.loadCollaboratorDetails(Number(collaboratorId));
      this.loadCollaboratorInvitations(Number(collaboratorId));
    } else {
      this.viewMode = 'summary';
      this.loadInvitationsSummary();
    }
  }

  private loadInvitationsSummary(): void {
    this.loadingStore.setLoading();
    this.invitationApiService.getInvitationsSummary().subscribe({
      next: (summary) => {
        this.invitationsSummary = summary;
        this.loadingStore.setLoadingSuccess();
      },
      error: (error) => {
        this.alertService.showError('Failed to load invitations summary');
        this.loadingStore.setLoadingFailed();
      }
    });
  }

  private loadCollaboratorDetails(collaboratorId: number): void {
    this.collaboratorApiService.getById(collaboratorId).subscribe({
      next: (collaborator) => {
        this.selectedCollaborator = collaborator;
      },
      error: (error) => {
        this.alertService.showError('Failed to load collaborator details');
        this.router.navigate(['/collaborators']);
      }
    });
  }

  private loadCollaboratorInvitations(collaboratorId: number): void {
    this.loadingStore.setLoading();
    this.invitationApiService.getCollaboratorInvitations(collaboratorId).subscribe({
      next: (invitations) => {
        this.selectedCollaboratorInvitations = invitations;
        this.loadingStore.setLoadingSuccess();
      },
      error: (error) => {
        this.alertService.showError('Failed to load collaborator invitations');
        this.loadingStore.setLoadingFailed();
      }
    });
  }

  viewCollaboratorInvitations(invitation: CollaboratorInvitationModel): void {
    this.router.navigate(['/collaborators', invitation.collaboratorId, 'invitations']);
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'badge-warning';
      case 'ACCEPTED':
        return 'badge-success';
      case 'REJECTED':
        return 'badge-error';
      case 'CANCELLED':
        return 'badge-ghost';
      default:
        return 'badge-ghost';
    }
  }

  getFormattedDate(date: Date): string {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - new Date(date).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }

  backToList(): void {
    if (this.viewMode === 'details') {
      this.router.navigate(['/collaborators']);
    }
  }
}