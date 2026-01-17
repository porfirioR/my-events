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
import { CollaboratorMatchRequestApiService } from '../../services/api/collaborator-match-request-api.service';
import { AlertService, FormatterHelperService } from '../../services';
import { useLoadingStore } from '../../store';
import { MessageTranslationService } from '../../services/helpers';

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
  private matchRequestApiService = inject(CollaboratorMatchRequestApiService);
  private alertService = inject(AlertService);
  private messageTranslationService = inject(MessageTranslationService);
  private loadingStore = useLoadingStore();
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private formatterService = inject(FormatterHelperService);
  protected getFormattedDate = this.formatterService.getFormattedDate.bind(this.formatterService)

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
        const errorMessage = this.messageTranslationService.translateErrorMessage(error);
        this.alertService.showError(errorMessage);
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
        const errorMessage = this.messageTranslationService.translateErrorMessage(error);
        this.alertService.showError(errorMessage);
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
        const errorMessage = this.messageTranslationService.translateErrorMessage(error);
        this.alertService.showError(errorMessage);
        this.loadingStore.setLoadingFailed();
      }
    });
  }

  viewCollaboratorInvitations(invitation: CollaboratorInvitationModel): void {
    this.router.navigate(['/collaborators', invitation.collaborator.id, 'invitations']);
  }

  // Accept invitation from this component
  acceptInvitation(invitation: ReceivedMatchRequestModel): void {
    const confirmMsg = `Accept match request from ${invitation.requesterCollaboratorName}?`;
    
    if (confirm(confirmMsg)) {
      this.loadingStore.setLoading();
      this.matchRequestApiService.acceptMatchRequest(invitation.id).subscribe({
        next: (response) => {
          // Use message translation service for success message
          const message = this.messageTranslationService.translateSuccessMessage(
            response, 
            'matchRequests.requestAcceptedSuccess'
          );
          this.alertService.showSuccess(message);
          
          // Reload invitations
          if (this.selectedCollaborator) {
            this.loadCollaboratorInvitations(this.selectedCollaborator.id);
          }
          this.loadingStore.setLoadingSuccess();
        },
        error: (error) => {
          // Use message translation service for error handling
          const errorMessage = this.messageTranslationService.translateErrorMessage(error);
          this.alertService.showError(errorMessage);
          this.loadingStore.setLoadingFailed();
        }
      });
    }
  }

  backToList(): void {
    if (this.viewMode === 'details') {
      this.router.navigate(['/collaborators/invitations']);
    }
  }
}