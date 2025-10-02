import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { 
  ReceivedMatchRequestModel, 
  CollaboratorMatchRequestModel,
  CreateMatchRequestApiRequest,
  CollaboratorApiModel
} from '../../models/api/collaborators';
import { CollaboratorMatchRequestApiService } from '../../services/api/collaborator-match-request-api.service';
import { CollaboratorApiService } from '../../services/api/collaborator-api.service';
import { AlertService } from '../../services';
import { useLoadingStore } from '../../store';

@Component({
  selector: 'app-collaborator-match-requests',
  standalone: true,
  templateUrl: './collaborator-match-requests.component.html',
  styleUrls: ['./collaborator-match-requests.component.css'],
  imports: [CommonModule, RouterModule, FormsModule]
})
export class CollaboratorMatchRequestsComponent implements OnInit {
  private matchRequestApiService = inject(CollaboratorMatchRequestApiService);
  private collaboratorApiService = inject(CollaboratorApiService);
  private alertService = inject(AlertService);
  private loadingStore = useLoadingStore();

  receivedRequests: ReceivedMatchRequestModel[] = [];
  sentRequests: CollaboratorMatchRequestModel[] = [];
  collaborators: CollaboratorApiModel[] = [];
  
  activeTab: 'received' | 'sent' | 'create' = 'received';
  isLoading = this.loadingStore.isLoading;

  // Create request form
  newRequest: CreateMatchRequestApiRequest = {
    collaboratorId: 0,
    targetEmail: ''
  };

  ngOnInit(): void {
    this.loadReceivedRequests();
    this.loadSentRequests();
    this.loadCollaborators();
  }

  private loadReceivedRequests(): void {
    this.loadingStore.setLoading();
    this.matchRequestApiService.getReceivedRequests().subscribe({
      next: (requests) => {
        this.receivedRequests = requests.filter(r => r.status === 'PENDING');
        this.loadingStore.setLoadingSuccess();
      },
      error: (error) => {
        this.alertService.showError('Failed to load received requests');
        this.loadingStore.setLoadingFailed();
      }
    });
  }

  private loadSentRequests(): void {
    this.matchRequestApiService.getSentRequests().subscribe({
      next: (requests) => {
        this.sentRequests = requests;
      },
      error: (error) => {
        this.alertService.showError('Failed to load sent requests');
      }
    });
  }

  private loadCollaborators(): void {
    this.collaboratorApiService.getExternalCollaborators().subscribe({
      next: (collaborators) => {
        this.collaborators = collaborators.filter(c => c.isActive);
      },
      error: (error) => {
        console.error('Failed to load collaborators:', error);
      }
    });
  }

  acceptRequest(request: ReceivedMatchRequestModel): void {
    this.matchRequestApiService.acceptRequest(request.id).subscribe({
      next: (match) => {
        this.alertService.showSuccess('Match request accepted successfully');
        this.loadReceivedRequests();
      },
      error: (error) => {
        this.alertService.showError('Failed to accept request');
      }
    });
  }

  rejectRequest(request: ReceivedMatchRequestModel): void {
    const confirmMsg = `Are you sure you want to reject the request from ${request.senderCollaboratorName} ${request.senderCollaboratorSurname}?`;
    
    if (confirm(confirmMsg)) {
      this.matchRequestApiService.rejectRequest(request.id).subscribe({
        next: (response) => {
          this.alertService.showSuccess(response.message);
          this.loadReceivedRequests();
        },
        error: (error) => {
          this.alertService.showError('Failed to reject request');
        }
      });
    }
  }

  cancelRequest(request: CollaboratorMatchRequestModel): void {
    const confirmMsg = 'Are you sure you want to cancel this request?';
    
    if (confirm(confirmMsg)) {
      this.matchRequestApiService.cancelRequest(request.id).subscribe({
        next: (response) => {
          this.alertService.showSuccess(response.message);
          this.loadSentRequests();
        },
        error: (error) => {
          this.alertService.showError('Failed to cancel request');
        }
      });
    }
  }

  createMatchRequest(): void {
    if (!this.newRequest.collaboratorId || !this.newRequest.targetEmail) {
      this.alertService.showInfo('Please fill in all fields');
      return;
    }

    this.matchRequestApiService.createMatchRequest(this.newRequest).subscribe({
      next: (response) => {
        this.alertService.showSuccess(response.message);
        this.newRequest = { collaboratorId: 0, targetEmail: '' };
        this.activeTab = 'sent';
        this.loadSentRequests();
      },
      error: (error) => {
        this.alertService.showError('Failed to create match request');
      }
    });
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
}