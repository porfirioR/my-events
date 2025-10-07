// collaborator-match-requests.component.ts
import { Component, inject, OnInit, signal } from '@angular/core'; // ⭐ Agregar signal
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
import { forkJoin } from 'rxjs';

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

  private externalCollaborators: CollaboratorApiModel[] = [];
  protected internalCollaborators: CollaboratorApiModel[] = [];
  protected receivedRequests: ReceivedMatchRequestModel[] = [];
  protected sentRequests: CollaboratorMatchRequestModel[] = [];
  protected activeTab: 'received' | 'sent' | 'create' = 'received';
  protected internalCollaboratorList?: KeyValueViewModel[] = [];
  
  // ⭐ NUEVO: Estado de carga inicial separado
  protected initialLoading = signal(true);
  protected isLoading = this.loadingStore.isLoading;

  showCollaboratorSelectionModal = false;
  pendingRequestToAccept: ReceivedMatchRequestModel | null = null;
  selectedCollaboratorForAccept: number | null = null;
  internalCollaboratorsForAcceptList: KeyValueViewModel[] = [];

  protected formGroup: FormGroup<MatchRequestFormGroup>;

  constructor() {
    this.formGroup = new FormGroup<MatchRequestFormGroup>({
      collaboratorId: new FormControl(null, [Validators.required]),
      targetEmail: new FormControl(null, [Validators.required, Validators.email]),
    });
  }

  ngOnInit(): void {
    this.loadAllData();
  }

  private loadAllData(): void {
    // ⭐ Solo usar loadingStore para acciones del usuario, no para carga inicial
    const isInitial = this.initialLoading();
    
    if (!isInitial) {
      this.loadingStore.setLoading();
    }

    forkJoin({
      received: this.matchRequestApiService.getReceivedRequests(),
      sent: this.matchRequestApiService.getSentRequests(),
      internal: this.collaboratorApiService.getUnlinkedCollaborators(),
      external: this.collaboratorApiService.getLinkedCollaborators()
    }).subscribe({
      next: (results) => {
        this.receivedRequests = results.received;
        this.sentRequests = results.sent;
        this.internalCollaborators = results.internal.filter(c => c.isActive);
        this.externalCollaborators = results.external.filter(c => c.isActive);

        // Actualizar listas para selects
        this.internalCollaboratorList = HelperService.convertToList(
          this.internalCollaborators, 
          Configurations.Collaborator
        );
        this.internalCollaboratorsForAcceptList = this.internalCollaboratorList;

        if (isInitial) {
          this.initialLoading.set(false);
        } else {
          this.loadingStore.setLoadingSuccess();
        }
      },
      error: (error) => {
        this.alertService.showError('Failed to load data');
        
        if (isInitial) {
          this.initialLoading.set(false);
        } else {
          this.loadingStore.setLoadingFailed();
        }
      }
    });
  }

  protected exit = () => this.router.navigate(['/collaborators']);

  acceptRequest(request: ReceivedMatchRequestModel): void {
    const hasCollaboratorWithEmail = this.externalCollaborators.some(
      x => x.email?.toLowerCase() === request.requesterUserEmail.toLowerCase()
    );

    if (hasCollaboratorWithEmail) {
      this.acceptDirectly(request);
    } else {
      this.showCollaboratorSelection(request);
    }
  }

  private acceptDirectly(request: ReceivedMatchRequestModel): void {
    const confirmMsg = `Accept match request from ${request.requesterUserEmail}?`;
    
    if (confirm(confirmMsg)) {
      this.loadingStore.setLoading();
      this.matchRequestApiService.acceptMatchRequest(request.id).subscribe({
        next: () => {
          this.alertService.showSuccess('Match request accepted successfully!');
          this.loadAllData();
        },
        error: (error) => {
          this.alertService.showError(error.error?.message || 'Failed to accept request');
          this.loadingStore.setLoadingFailed();
        }
      });
    }
  }

  private showCollaboratorSelection = (request: ReceivedMatchRequestModel): void => {
    if (this.internalCollaborators.length === 0) {
      this.alertService.showError('You need to create an internal collaborator first to accept this invitation.');
      return;
    }

    this.pendingRequestToAccept = request;
    this.selectedCollaboratorForAccept = null;
    this.showCollaboratorSelectionModal = true;
  }

  protected confirmAcceptWithCollaborator = (): void => {
    if (!this.selectedCollaboratorForAccept || !this.pendingRequestToAccept) {
      return;
    }

    this.loadingStore.setLoading();

    this.matchRequestApiService.acceptMatchRequestWithCollaborator(
      this.pendingRequestToAccept.id,
      this.selectedCollaboratorForAccept
    ).subscribe({
      next: () => {
        this.alertService.showSuccess('Match request accepted! Email assigned to your collaborator.');
        this.showCollaboratorSelectionModal = false;
        this.pendingRequestToAccept = null;
        this.selectedCollaboratorForAccept = null;
        this.loadAllData();
      },
      error: (error) => {
        this.alertService.showError(error.error?.message || 'Failed to accept request');
        this.loadingStore.setLoadingFailed();
      }
    });
  }

  cancelCollaboratorSelection(): void {
    this.showCollaboratorSelectionModal = false;
    this.pendingRequestToAccept = null;
    this.selectedCollaboratorForAccept = null;
  }

  cancelRequest(request: CollaboratorMatchRequestModel): void {
    const confirmMsg = 'Are you sure you want to cancel this request?';
    if (confirm(confirmMsg)) {
      this.loadingStore.setLoading();
      this.matchRequestApiService.cancelMatchRequest(request.id).subscribe({
        next: (response) => {
          this.alertService.showSuccess(response.message || 'Request cancelled successfully');
          this.loadAllData();
        },
        error: (error) => {
          this.alertService.showError(error.error?.message || 'Failed to cancel request');
          this.loadingStore.setLoadingFailed();
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
    const request = new CreateMatchRequestRequest(
      this.formGroup.value.collaboratorId!, 
      this.formGroup.value.targetEmail!
    );
    
    this.matchRequestApiService.createMatchRequest(request).subscribe({
      next: (response) => {
        this.alertService.showSuccess(response.message);
        this.formGroup.reset();
        this.activeTab = 'sent';
        this.loadAllData();
      },
      error: (error) => {
        this.alertService.showError(error.error?.message || 'Failed to create match request');
        this.loadingStore.setLoadingFailed();
      }
    });
  }

  getStatusBadgeClass(status: string): string {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return 'bg-warning/20 text-warning border-warning/30';
      case 'ACCEPTED':
        return 'bg-success/20 text-success border-success/30';
      case 'EMAILNOTFOUND':
        return 'bg-info/20 text-info border-info/30';
      default:
        return 'bg-base-content/20 text-base-content border-base-content/30';
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