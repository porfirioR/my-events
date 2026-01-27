import { Component, input, OnInit, output } from '@angular/core';
import { useTravelStore } from '../../store';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.css']
})
export class FileUploadComponent {
  private travelStore = useTravelStore();

  // Inputs
  disabled = input(false);
  maxSize = input(10 * 1024 * 1024); // 10MB default

  // Outputs
  fileSelected = output<File | undefined>();

  // State
  selectedFile = input<File | undefined>();
  error = input<string | undefined>();
  isDragOver = false;

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.handleFile(input.files[0]);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files?.length) {
      this.handleFile(files[0]);
    }
  }

  private handleFile(file: File) {
    if (this.disabled()) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.fileSelected.emit(undefined);
      return;
    }

    // Validate file size
    if (file.size > this.maxSize()) {
      this.fileSelected.emit(undefined);
      return;
    }

    this.fileSelected.emit(file);
  }

  removeFile() {
    if (this.disabled()) return;
    this.fileSelected.emit(undefined);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  getDropZoneClasses(): string {
    const baseClasses = 'border-base-300 bg-base-50';

    if (this.disabled()) {
      return `${baseClasses} opacity-50`;
    }

    if (this.isDragOver) {
      return 'border-primary bg-primary/10';
    }

    return baseClasses;
  }

}
