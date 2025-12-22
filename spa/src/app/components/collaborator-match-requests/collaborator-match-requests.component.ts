import { Component, computed, inject, OnInit, Signal, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormControl, FormGroup, FormsModule, Validators, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { 
  ReceivedMatchRequestModel, 
  CollaboratorMatchRequestModel,
  CollaboratorApiModel,
  CreateMatchRequestRequest
} from '../../models/api/collaborators';
import { CollaboratorMatchRequestApiService } from '../../services/api/collaborator-match-request-api.service';
import { CollaboratorApiService } from '../../services/api/collaborator-api.service';
import { AlertService, FormatterHelperService } from '../../services';
import { useCollaboratorStore, useLoadingStore } from '../../store';
import { TextComponent } from '../inputs/text/text.component';
import { MatchRequestFormGroup } from '../../models/forms';
import { SelectInputComponent } from '../inputs/select-input/select-input.component';
import { KeyValueViewModel } from '../../models/view';
import { Configurations } from '../../models/enums';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-collaborator-match-requests',
  templateUrl: './collaborator-match-requests.component.html',
  styleUrls: ['./collaborator-match-requests.component.css'],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    TranslateModule,
    TextComponent,
    ReactiveFormsModule,
    SelectInputComponent,
  ]
})
export class CollaboratorMatchRequestsComponent implements OnInit {
  private matchRequestApiService = inject(CollaboratorMatchRequestApiService);
  private collaboratorApiService = inject(CollaboratorApiService);
  private alertService = inject(AlertService);
  private translate = inject(TranslateService);
  private loadingStore = useLoadingStore();
  private router = inject(Router);
  private readonly collaboratorStore = useCollaboratorStore();
  private formatterService = inject(FormatterHelperService);
  private externalCollaborators: CollaboratorApiModel[] = [];
  protected receivedRequests: ReceivedMatchRequestModel[] = [];
  protected sentRequests: CollaboratorMatchRequestModel[] = [];
  protected activeTab: 'received' | 'sent' | 'create' = 'received';

  protected initialLoading = signal(true);
  protected isLoading = this.loadingStore.isLoading;

  protected showCollaboratorSelectionModal = false;
  protected pendingRequestToAccept: ReceivedMatchRequestModel | null = null;
  protected internalCollaborators: Signal<KeyValueViewModel[]> = computed(() => {
    const linkedCollaborators = this.collaboratorStore.unlinkedCollaborators()
    return FormatterHelperService.convertToList(linkedCollaborators, Configurations.Collaborator)
  });

  public formGroup: FormGroup<MatchRequestFormGroup>;
  public ignorePreventUnsavedChanges = false

  constructor() {
    this.formGroup = new FormGroup<MatchRequestFormGroup>({
      collaboratorId: new FormControl(null, [Validators.required]),
      targetEmail: new FormControl(null, [Validators.required, Validators.email]),
    });
  }

  ngOnInit(): void {
    this.loadAllData();
  }

  protected exit = () => this.router.navigate(['/collaborators']);

  protected acceptRequest(request: ReceivedMatchRequestModel): void {
    const hasCollaboratorWithEmail = this.externalCollaborators.some(
      x => x.email?.toLowerCase() === request.requesterUserEmail.toLowerCase()
    );

    if (hasCollaboratorWithEmail) {
      this.acceptDirectly(request);
    } else {
      this.showCollaboratorSelection(request);
    }
  }

  protected confirmAcceptWithCollaborator = (): void => {
    if (!this.formGroup.value.collaboratorId || !this.pendingRequestToAccept) {
      return;
    }

    this.loadingStore.setLoading();

    this.matchRequestApiService.acceptMatchRequestWithCollaborator(
      this.pendingRequestToAccept.id,
      this.formGroup.value.collaboratorId
    ).subscribe({
      next: () => {
        this.alertService.showSuccess(
          this.translate.instant('matchRequests.requestAccepted')
        );
        this.showCollaboratorSelectionModal = false;
        this.pendingRequestToAccept = null;
        this.formGroup.controls.collaboratorId.setValue(null)
        this.loadAllData();
      },
      error: (error) => {
        this.alertService.showError(
          error.error?.message || this.translate.instant('matchRequests.failedToAccept')
        );
        this.loadingStore.setLoadingFailed();
      }
    });
  }

  protected cancelCollaboratorSelection(): void {
    this.showCollaboratorSelectionModal = false;
    this.pendingRequestToAccept = null;
    this.formGroup.controls.collaboratorId.setValue(null)
  }

  protected cancelRequest(request: CollaboratorMatchRequestModel): void {
    const confirmMsg = this.translate.instant('matchRequests.confirmCancelRequest');

    if (confirm(confirmMsg)) {
      this.loadingStore.setLoading();
      this.matchRequestApiService.cancelMatchRequest(request.id).subscribe({
        next: (response) => {
          this.alertService.showSuccess(
            response.message || this.translate.instant('matchRequests.requestCancelled')
          );
          this.loadAllData();
        },
        error: (error) => {
          this.alertService.showError(
            error.error?.message || this.translate.instant('matchRequests.failedToCancel')
          );
          this.loadingStore.setLoadingFailed();
        }
      });
    }
  }

  protected createMatchRequest(): void {
    if (this.formGroup.invalid) {
      this.alertService.showInfo(
        this.translate.instant('matchRequests.pleaseFillAllFields')
      );
      return;
    }

    this.loadingStore.setLoading();
    const request = new CreateMatchRequestRequest(
      this.formGroup.value.collaboratorId!, 
      this.formGroup.value.targetEmail!
    );

    this.matchRequestApiService.createMatchRequest(request).subscribe({
      next: (response) => {
        this.alertService.showSuccess(
          response.message || this.translate.instant('matchRequests.requestCreated')
        );
        this.formGroup.reset();
        this.activeTab = 'sent';
        this.ignorePreventUnsavedChanges = true
        this.loadAllData();
      },
      error: (error) => {
        this.alertService.showError(
          error.error?.message || this.translate.instant('matchRequests.failedToCreate')
        );
        this.loadingStore.setLoadingFailed();
      }
    });
  }

  protected getStatusBadgeClass(status: string): string {
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

  protected getFormattedDate = this.formatterService.getFormattedDate;

  private loadAllData(): void {
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
        this.externalCollaborators = results.external.filter(x => x.isActive);

        if (isInitial) {
          this.initialLoading.set(false);
        } else {
          this.loadingStore.setLoadingSuccess();
        }
      },
      error: (error) => {
        this.alertService.showError(
          this.translate.instant('matchRequests.failedToLoadData')
        );
        if (isInitial) {
          this.initialLoading.set(false);
        } else {
          this.loadingStore.setLoadingFailed();
        }
      }
    });
  }

  private acceptDirectly(request: ReceivedMatchRequestModel): void {
    const confirmMsg = this.translate.instant('matchRequests.acceptMatchRequest', { 
      email: request.requesterUserEmail 
    });

    if (confirm(confirmMsg)) {
      this.loadingStore.setLoading();
      this.matchRequestApiService.acceptMatchRequest(request.id).subscribe({
        next: () => {
          this.alertService.showSuccess(
            this.translate.instant('matchRequests.requestAcceptedSuccess')
          );
          this.loadAllData();
        },
        error: (error) => {
          this.alertService.showError(
            error.error?.message || this.translate.instant('matchRequests.failedToAccept')
          );
          this.loadingStore.setLoadingFailed();
        }
      });
    }
  }

  private showCollaboratorSelection = (request: ReceivedMatchRequestModel): void => {
    if (this.internalCollaborators().length === 0) {
      this.alertService.showError(
        this.translate.instant('matchRequests.needInternalCollaborator')
      );
      return;
    }

    this.pendingRequestToAccept = request;
    this.formGroup.controls.collaboratorId.setValue(null)
    this.showCollaboratorSelectionModal = true;
  }
}