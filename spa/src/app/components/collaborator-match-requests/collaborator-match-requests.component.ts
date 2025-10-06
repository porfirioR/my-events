// collaborator-match-requests.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormControl, FormGroup, FormsModule, Validators, ReactiveFormsModule } from '@angular/forms';
import { 
  ReceivedMatchRequestModel, 
  CollaboratorMatchRequestModel,
  CollaboratorApiModel,
  CreateMatchRequestRequest
} from '../../models/api/collaborators';
import { CollaboratorMatchRequestApiService } from '../../services/api/collaborator-match-request-api.service';
import { CollaboratorApiService } from '../../services/api/collaborator-api.service';
import { AlertService, HelperService } from '../../services';
import { useLoadingStore } from '../../store';
import { TextComponent } from '../inputs/text/text.component';
import { MatchRequestFormGroup } from '../../models/forms';
import { SelectInputComponent } from '../inputs/select-input/select-input.component';
import { KeyValueViewModel } from '../../models/view';
import { Configurations } from '../../models/enums';

@Component({
  selector: 'app-collaborator-match-requests',
  standalone: true,
  templateUrl: './collaborator-match-requests.component.html',
  styleUrls: ['./collaborator-match-requests.component.css'],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    TextComponent,
    ReactiveFormsModule,
    SelectInputComponent,
  ]
})
export class CollaboratorMatchRequestsComponent implements OnInit {
  private matchRequestApiService = inject(CollaboratorMatchRequestApiService);
  private collaboratorApiService = inject(CollaboratorApiService);
  private alertService = inject(AlertService);
  private loadingStore = useLoadingStore();
  private router = inject(Router);

  receivedRequests: ReceivedMatchRequestModel[] = [];
  sentRequests: CollaboratorMatchRequestModel[] = [];
  internalCollaborators: CollaboratorApiModel[] = []; // ⭐ CAMBIO: Solo internos
  activeTab: 'received' | 'sent' | 'create' = 'received';
  protected internalCollaboratorList?: KeyValueViewModel[] = []
  protected isLoading = this.loadingStore.isLoading;

  // Create request form
  protected formGroup: FormGroup<MatchRequestFormGroup>

  constructor() {
    this.formGroup = new FormGroup<MatchRequestFormGroup>({
      collaboratorId: new FormControl(null, [Validators.required, Validators.minLength(5), Validators.maxLength(10)]),
      targetEmail: new FormControl(null, [Validators.required, Validators.email]),
    })
    
  }

  ngOnInit(): void {
    this.loadReceivedRequests();
    this.loadSentRequests();
    this.loadInternalCollaborators();
  }

  private loadReceivedRequests(): void {
    this.loadingStore.setLoading();
    this.matchRequestApiService.getReceivedRequests().subscribe({
      next: (requests) => {
        this.receivedRequests = requests;
        this.loadingStore.setLoadingSuccess();
      },
      error: (error) => {
        this.alertService.showError(error.error?.message || 'Failed to load received requests');
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
        this.alertService.showError(error.error?.message || 'Failed to load sent requests');
      }
    });
  }

  private loadInternalCollaborators(): void {
    this.collaboratorApiService.getInternalCollaborators().subscribe({
      next: (collaborators) => {
        this.internalCollaborators = collaborators.filter(c => c.isActive);
        this.internalCollaboratorList = HelperService.convertToList(this.internalCollaborators, Configurations.Collaborator)
      },
      error: (error) => {
        console.error('Failed to load internal collaborators:', error);
      }
    });
  }

  protected exit = () => this.router.navigate(['/collaborators']);

  acceptRequest(request: ReceivedMatchRequestModel): void {
    const confirmMsg = `Accept match request from ${request.requesterCollaboratorName}?`;
    
    if (confirm(confirmMsg)) {
      this.loadingStore.setLoading();
      this.matchRequestApiService.acceptMatchRequest(request.id).subscribe({
        next: (match) => {
          this.alertService.showSuccess('Match request accepted successfully! Collaborator email has been assigned.');
          this.loadReceivedRequests();
          this.loadSentRequests();
          this.loadingStore.setLoadingSuccess();
        },
        error: (error) => {
          this.alertService.showError(error.error?.message || 'Failed to accept request');
          this.loadingStore.setLoadingFailed();
        }
      });
    }
  }

  cancelRequest(request: CollaboratorMatchRequestModel): void {
    const confirmMsg = 'Are you sure you want to cancel this request?';
    if (confirm(confirmMsg)) {
      this.matchRequestApiService.cancelMatchRequest(request.id).subscribe({
        next: (response) => {
          this.alertService.showSuccess(response.message || 'Request cancelled successfully');
          this.loadSentRequests();
        },
        error: (error) => {
          this.alertService.showError(error.error?.message || 'Failed to cancel request');
        }
      });
    }
  }

  createMatchRequest(): void {
    if (this.formGroup.invalid) {
      this.alertService.showInfo('Please fill in all fields');
      return;
    }

    this.loadingStore.setLoading();
    const request = new CreateMatchRequestRequest(this.formGroup.value.collaboratorId!, this.formGroup.value.targetEmail!)
    this.matchRequestApiService.createMatchRequest(request).subscribe({
      next: (response) => {
        this.alertService.showSuccess(response.message);
        this.formGroup.reset()
        this.activeTab = 'sent';
        this.loadSentRequests();
        this.loadInternalCollaborators(); // Refrescar la lista
        this.loadingStore.setLoadingSuccess();
      },
      error: (error) => {
        // ⭐ Mostrar el mensaje de error específico del backend
        this.alertService.showError(error.error?.message || 'Failed to create match request');
        this.loadingStore.setLoadingFailed();
      }
    });
  }

  getStatusBadgeClass(status: string): string {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return 'badge-warning';
      case 'ACCEPTED':
        return 'badge-success';
      case 'EMAILNOTFOUND':
        return 'badge-info';
      default:
        return 'badge-ghost';
    }
  }

  getFormattedDate(date: Date): string {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - new Date(date).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }
}