import { Component, input, inject, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { OperationAttachmentApiModel } from '../../models/api/travels';
import { useTravelStore } from '../../store';
import { AlertService } from '../../services';

@Component({
  selector: 'app-attachment-list',
  templateUrl: './attachment-list.component.html',
  styleUrls: ['./attachment-list.component.css'],
  imports: [CommonModule, TranslateModule]
})
export class AttachmentListComponent implements OnInit {
  private travelStore = useTravelStore();
  private alertService = inject(AlertService);
  private translate = inject(TranslateService);

  // Inputs
  operationId = input.required<number>();
  canDelete = input(true);
  showUploadButton = input(false);

  // State
  protected isDeleting = signal(false);

  // Computed
  protected attachments = computed(() => 
    this.travelStore.getAttachmentsForOperation()(this.operationId())
  );

  protected attachmentCount = computed(() => 
    this.travelStore.getAttachmentCountForOperation()(this.operationId())
  );

  ngOnInit() {
    // Load attachments for this operation
    this.travelStore.loadOperationAttachments(this.operationId());
  }

  protected async deleteAttachment(attachment: OperationAttachmentApiModel): Promise<void> {
    if (this.isDeleting()) return;

    const result = await this.alertService.showQuestionModal(
      this.translate.instant('operations.deleteAttachmentTitle'),
      this.translate.instant('operations.deleteAttachmentMessage', { fileName: attachment.fileName })
    );

    if (result.isConfirmed) {
      this.isDeleting.set(true);

      try {
        this.travelStore.deleteAttachment({
          attachmentId: attachment.id,
          operationId: this.operationId()
        });
        
        this.alertService.showSuccess(
          this.translate.instant('operations.attachmentDeletedSuccess')
        );
      } catch (error) {
        this.alertService.showError(
          this.translate.instant('operations.attachmentDeletedError')
        );
      } finally {
        this.isDeleting.set(false);
      }
    }
  }

  protected openAttachment(attachment: OperationAttachmentApiModel): void {
    // Open in new tab
    window.open(attachment.fileUrl, '_blank');
  }

  protected formatFileSize(bytes: number | null): string {
    if (!bytes) return '';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  protected formatDate(date: string): string {
    return new Date(date).toLocaleDateString();
  }
}