import { Component } from '@angular/core';
import { CollaboratorApiModel } from '../../models/api';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-collaborators',
  templateUrl: './collaborators.component.html',
  styleUrls: ['./collaborators.component.css'],
  imports: [
    CommonModule,
    RouterModule,
  ]
})
export class CollaboratorsComponent {
  collaborators: CollaboratorApiModel[] = [];
  totalCollaborators = 0;
  currentPage = 1;
  totalPages = 1;

  // Get initials for avatar
  getInitials(name: string, surname: string): string {
    return (name.charAt(0) + surname.charAt(0)).toUpperCase();
  }

  // Format date
  getFormattedDate(date: Date): string {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }

  // Action methods
  editCollaborator(collaborator: CollaboratorApiModel): void {
    console.log('Edit collaborator:', collaborator);
    // Implement edit logic
  }

  toggleCollaboratorStatus(collaborator: CollaboratorApiModel): void {
    console.log('Toggle status for:', collaborator);
    // Implement toggle status logic
    collaborator.isActive = !collaborator.isActive;
  }

  viewCollaboratorStats(collaborator: CollaboratorApiModel): void {
    console.log('View stats for:', collaborator);
    // Implement view statistics logic
  }

  deleteCollaborator(collaborator: CollaboratorApiModel): void {
    console.log('Delete collaborator:', collaborator);
    // Implement delete logic with confirmation
    const confirmDelete = confirm(`Are you sure you want to delete ${collaborator.name} ${collaborator.surname}?`);
    if (confirmDelete) {
      this.collaborators = this.collaborators.filter(c => c.id !== collaborator.id);
    }
  }

  addNewCollaborator(): void {
    console.log('Add new collaborator');
    // Implement add new collaborator logic
  }

  // Pagination methods
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadCollaborators();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadCollaborators();
    }
  }

  private loadCollaborators(): void {
    // Implement data loading logic
  }
}
