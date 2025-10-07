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
  internalCollaborators: CollaboratorApiModel[] = [];
  externalCollaborators: CollaboratorApiModel[] = []; // ⭐ NUEVO
  activeTab: 'received' | 'sent' | 'create' = 'received';
  protected internalCollaboratorList?: KeyValueViewModel[] = [];
  protected isLoading = this.loadingStore.isLoading;

  // ⭐ NUEVO: Para modal de selección de colaborador
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
    this.loadReceivedRequests();
    this.loadSentRequests();
    this.loadInternalCollaborators();
    this.loadExternalCollaborators(); // ⭐ NUEVO
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
        this.internalCollaboratorList = HelperService.convertToList(
          this.internalCollaborators, 
          Configurations.Collaborator
        );
        // ⭐ Para el modal de aceptación
        this.internalCollaboratorsForAcceptList = this.internalCollaboratorList;
      },
      error: (error) => {
        console.error('Failed to load internal collaborators:', error);
      }
    });
  }

  // ⭐ NUEVO: Cargar colaboradores externos
  private loadExternalCollaborators(): void {
    this.collaboratorApiService.getExternalCollaborators().subscribe({
      next: (collaborators) => {
        this.externalCollaborators = collaborators.filter(c => c.isActive);
      },
      error: (error) => {
        console.error('Failed to load external collaborators:', error);
      }
    });
  }

  protected exit = () => this.router.navigate(['/collaborators']);

  // ⭐ ACTUALIZADO: Verificar si tiene colaborador con ese email
  acceptRequest(request: ReceivedMatchRequestModel): void {
    // Verificar si tengo colaborador externo con ese email
    const hasCollaboratorWithEmail = this.externalCollaborators.some(
      c => c.email?.toLowerCase() === request.targetCollaboratorEmail.toLowerCase()
    );

    if (hasCollaboratorWithEmail) {
      // Ya tengo colaborador, aceptar directamente
      this.acceptDirectly(request);
    } else {
      // No tengo colaborador, mostrar modal para seleccionar
      this.showCollaboratorSelection(request);
    }
  }

  // ⭐ NUEVO: Aceptar directamente (cuando ya tiene el email)
  private acceptDirectly(request: ReceivedMatchRequestModel): void {
    const confirmMsg = `Accept match request from ${request.requesterCollaboratorName}?`;
    
    if (confirm(confirmMsg)) {
      this.loadingStore.setLoading();
      this.matchRequestApiService.acceptMatchRequest(request.id).subscribe({
        next: () => {
          this.alertService.showSuccess('Match request accepted successfully!');
          this.loadReceivedRequests();
          this.loadSentRequests();
          this.loadExternalCollaborators(); // Refrescar externos
          this.loadingStore.setLoadingSuccess();
        },
        error: (error) => {
          this.alertService.showError(error.error?.message || 'Failed to accept request');
          this.loadingStore.setLoadingFailed();
        }
      });
    }
  }

  // ⭐ NUEVO: Mostrar modal de selección
  private showCollaboratorSelection(request: ReceivedMatchRequestModel): void {
    if (this.internalCollaborators.length === 0) {
      this.alertService.showError('You need to create an internal collaborator first to accept this invitation.');
      return;
    }

    this.pendingRequestToAccept = request;
    this.selectedCollaboratorForAccept = null;
    this.showCollaboratorSelectionModal = true;
  }

  // ⭐ NUEVO: Confirmar aceptación con colaborador seleccionado
  confirmAcceptWithCollaborator(): void {
    if (!this.selectedCollaboratorForAccept || !this.pendingRequestToAccept) return;

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
        this.loadReceivedRequests();
        this.loadSentRequests();
        this.loadInternalCollaborators(); // El colaborador ahora tiene email
        this.loadExternalCollaborators(); // Refrescar externos
        this.loadingStore.setLoadingSuccess();
      },
      error: (error) => {
        this.alertService.showError(error.error?.message || 'Failed to accept request');
        this.loadingStore.setLoadingFailed();
      }
    });
  }

  // ⭐ NUEVO: Cancelar selección de colaborador
  cancelCollaboratorSelection(): void {
    this.showCollaboratorSelectionModal = false;
    this.pendingRequestToAccept = null;
    this.selectedCollaboratorForAccept = null;
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
    const request = new CreateMatchRequestRequest(
      this.formGroup.value.collaboratorId!, 
      this.formGroup.value.targetEmail!
    );
    
    this.matchRequestApiService.createMatchRequest(request).subscribe({
      next: (response) => {
        this.alertService.showSuccess(response.message);
        this.formGroup.reset();
        this.activeTab = 'sent';
        this.loadSentRequests();
        this.loadInternalCollaborators();
        this.loadingStore.setLoadingSuccess();
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