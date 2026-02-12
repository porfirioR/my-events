import { CommonModule } from '@angular/common';
import { Component, input, output, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.css'],
  imports: [CommonModule, TranslateModule]
})
export class FileUploadComponent {
  disabled = input(false);
  maxSize = input(10 * 1024 * 1024); // 10MB default
  label = input('operations.attachReceipt');
  required = input(false);

  // Outputs
  fileSelected = output<File | undefined>();

  // State
  protected selectedFile = signal<File | undefined>(undefined);
  protected error = signal<string | undefined>(undefined);
  protected isDragOver = signal(false);

  protected onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.handleFile(input.files[0]);
    }
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    
    const files = event.dataTransfer?.files;
    if (files?.length) {
      this.handleFile(files[0]);
    }
  }

  private handleFile(file: File): void {
    if (this.disabled()) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.error.set('operations.invalidFileType');
      this.selectedFile.set(undefined);
      this.fileSelected.emit(undefined);
      return;
    }

    // Validate file size
    if (file.size > this.maxSize()) {
      this.error.set('operations.fileTooLarge');
      this.selectedFile.set(undefined);
      this.fileSelected.emit(undefined);
      return;
    }

    this.error.set(undefined);
    this.selectedFile.set(file);
    this.fileSelected.emit(file);
  }

  protected removeFile(): void {
    if (this.disabled()) return;
    this.selectedFile.set(undefined);
    this.error.set(undefined);
    this.fileSelected.emit(undefined);
  }

  protected formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  protected getDropZoneClasses(): string {
    const baseClasses = 'border-base-300 bg-base-50';
    
    if (this.disabled()) {
      return `${baseClasses} opacity-50`;
    }
    
    if (this.isDragOver()) {
      return 'border-primary bg-primary/10';
    }
    
    return baseClasses;
  }

}
