import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
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
import { ConfirmDialogComponent, ConfirmDialogResult } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-collaborator-invitations',
  standalone: true,
  templateUrl: './collaborator-invitations.component.html',
  styleUrls: ['./collaborator-invitations.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, TranslateModule, ConfirmDialogComponent]
})
export class CollaboratorInvitationsComponent implements OnInit {
  @ViewChild(ConfirmDialogComponent) confirmDialog!: ConfirmDialogComponent;
  private destroyRef = inject(DestroyRef);
  private invitationApiService = inject(CollaboratorInvitationApiService);
  private collaboratorApiService = inject(CollaboratorApiService);
  private matchRequestApiService = inject(CollaboratorMatchRequestApiService);
  private alertService = inject(AlertService);
  private messageTranslationService = inject(MessageTranslationService);
  private translate = inject(TranslateService);
  private loadingStore = useLoadingStore();
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private formatterService = inject(FormatterHelperService);
  protected getFormattedDate = this.formatterService.getFormattedDate.bind(this.formatterService)

  // Signals: el componente es OnPush y zoneless, sin signals no se redibuja al llegar los datos
  protected invitationsSummary = signal<CollaboratorInvitationModel[]>([]);
  protected selectedCollaboratorInvitations = signal<ReceivedMatchRequestModel[]>([]);
  protected selectedCollaborator = signal<CollaboratorApiModel | null>(null);
  // Flags propios por lista y no el loading global (otros pedidos lo apagan antes de tiempo)
  protected isSummaryLoading = signal<boolean>(false);
  protected isInvitationsLoading = signal<boolean>(false);
  
  viewMode: 'summary' | 'details' = 'summary';
  private pendingCallback: ((result: ConfirmDialogResult) => void) | null = null;

  protected onConfirmResult(result: ConfirmDialogResult): void {
    this.pendingCallback?.(result);
    this.pendingCallback = null;
  }

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
    this.isSummaryLoading.set(true);
    this.invitationApiService.getInvitationsSummary().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (summary) => {
        this.invitationsSummary.set(summary);
        this.isSummaryLoading.set(false);
      },
      error: (error) => {
        const errorMessage = this.messageTranslationService.translateErrorMessage(error);
        this.alertService.showError(errorMessage);
        this.isSummaryLoading.set(false);
      }
    });
  }

  private loadCollaboratorDetails(collaboratorId: number): void {
    this.collaboratorApiService.getById(collaboratorId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (collaborator) => {
        this.selectedCollaborator.set(collaborator);
      },
      error: (error) => {
        const errorMessage = this.messageTranslationService.translateErrorMessage(error);
        this.alertService.showError(errorMessage);
        this.router.navigate(['/collaborators']);
      }
    });
  }

  private loadCollaboratorInvitations(collaboratorId: number): void {
    this.isInvitationsLoading.set(true);
    this.invitationApiService.getCollaboratorInvitations(collaboratorId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (invitations) => {
        this.selectedCollaboratorInvitations.set(invitations);
        this.isInvitationsLoading.set(false);
      },
      error: (error) => {
        const errorMessage = this.messageTranslationService.translateErrorMessage(error);
        this.alertService.showError(errorMessage);
        this.isInvitationsLoading.set(false);
      }
    });
  }

  viewCollaboratorInvitations(invitation: CollaboratorInvitationModel): void {
    this.router.navigate(['/collaborators', invitation.collaborator.id, 'invitations']);
  }

  acceptInvitation(invitation: ReceivedMatchRequestModel): void {
    this.pendingCallback = (result: ConfirmDialogResult) => {
      if (!result.confirmed) return;
      this.loadingStore.setLoading();
      this.matchRequestApiService.acceptMatchRequest(invitation.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (response) => {
          const message = this.messageTranslationService.translateSuccessMessage(
            response,
            'matchRequests.requestAcceptedSuccess'
          );
          this.alertService.showSuccess(message);
          const collaborator = this.selectedCollaborator();
          if (collaborator) {
            this.loadCollaboratorInvitations(collaborator.id);
          }
          this.loadingStore.setLoadingSuccess();
        },
        error: (error) => {
          const errorMessage = this.messageTranslationService.translateErrorMessage(error);
          this.alertService.showError(errorMessage);
          this.loadingStore.setLoadingFailed();
        }
      });
    };
    this.confirmDialog.open({
      title: this.translate.instant('matchRequests.accept'),
      message: this.translate.instant('matchRequests.acceptMatchRequest', { email: invitation.requesterCollaboratorName }),
      type: 'info',
    });
  }

  backToList(): void {
    if (this.viewMode === 'details') {
      this.router.navigate(['/collaborators/invitations']);
    }
  }
}