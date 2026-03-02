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
  protected isUploading = signal(false); // ✅ NUEVO

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

  // ✅ NUEVO: Trigger upload
  protected triggerFileUpload(): void {
    if (this.isUploading()) return;
    
    const fileInput = document.getElementById(`file-upload-${this.operationId()}`) as HTMLInputElement;
    fileInput?.click();
  }

  // ✅ NUEVO: Handle file selection
  protected onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      this.alertService.showError(
        this.translate.instant('operations.fileSizeError')
      );
      return;
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv'
    ];

    if (!allowedTypes.includes(file.type)) {
      this.alertService.showError(
        this.translate.instant('operations.unsupportedFileType')
      );
      return;
    }

    this.uploadFile(file);
    
    // Clear input
    target.value = '';
  }

  // ✅ NUEVO: Upload file
  private uploadFile(file: File): void {
    this.isUploading.set(true);

    this.travelStore.uploadAttachment(this.operationId(), file).subscribe({
      next: () => {
        this.alertService.showSuccess(
          this.translate.instant('operations.attachmentUploadedSuccess')
        );
        // Reload attachments
        this.travelStore.loadOperationAttachments(this.operationId());
      },
      error: (error) => {
        console.error('Upload error:', error);
        this.alertService.showError(
          this.translate.instant('operations.attachmentUploadError')
        );
      },
      complete: () => {
        this.isUploading.set(false);
      }
    });
  }

  protected async deleteAttachment(attachment: OperationAttachmentApiModel): Promise<void> {
    if (this.isDeleting()) return;

    const result = await this.alertService.showQuestionModal(
      this.translate.instant('operations.deleteAttachmentTitle'),
      this.translate.instant('operations.deleteAttachmentMessage', { fileName: attachment.fileName }) // ✅ CORREGIDO
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
    window.open(attachment.fileUrl, '_blank'); // ✅ CORREGIDO
  }

  protected formatFileSize(bytes: number | null): string {
    if (!bytes) return '';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  // ✅ NUEVO: Get file icon based on type
  protected getFileIcon(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';

    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return 'fa-file-image';
      case 'pdf':
        return 'fa-file-pdf';
      case 'doc':
      case 'docx':
        return 'fa-file-word';
      case 'xls':
      case 'xlsx':
        return 'fa-file-excel';
      case 'txt':
        return 'fa-file-text';
      case 'csv':
        return 'fa-file-csv';
      default:
        return 'fa-file';
    }
  }

  protected formatDate(date: string | Date): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const day = dateObj.getUTCDate().toString().padStart(2, '0');
    const month = (dateObj.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }
}