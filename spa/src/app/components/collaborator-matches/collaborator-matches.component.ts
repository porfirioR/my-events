import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CollaboratorMatchModel } from '../../models/api/collaborators';
import { CollaboratorMatchApiService } from '../../services/api/collaborator-match-api.service';
import { AlertService } from '../../services';
import { useLoadingStore } from '../../store';

@Component({
  selector: 'app-collaborator-matches',
  standalone: true,
  templateUrl: './collaborator-matches.component.html',
  styleUrls: ['./collaborator-matches.component.css'],
  imports: [CommonModule, RouterModule]
})
export class CollaboratorMatchesComponent implements OnInit {
  private matchApiService = inject(CollaboratorMatchApiService);
  private alertService = inject(AlertService);
  private loadingStore = useLoadingStore();

  matches: CollaboratorMatchModel[] = [];
  isLoading = this.loadingStore.isLoading;

  ngOnInit(): void {
    this.loadMatches();
  }

  private loadMatches(): void {
    this.loadingStore.setLoading();
    this.matchApiService.getMatches().subscribe({
      next: (matches) => {
        this.matches = matches;
        this.loadingStore.setLoadingSuccess();
      },
      error: (error) => {
        this.alertService.showError('Failed to load matches');
        this.loadingStore.setLoadingFailed();
      }
    });
  }

  deleteMatch(match: CollaboratorMatchModel): void {
    const confirmMsg = `Are you sure you want to unmatch these collaborators? This will remove the email from the internal collaborator.`;

    if (confirm(confirmMsg)) {
      this.matchApiService.deleteMatch(match.id).subscribe({
        next: (response) => {
          this.alertService.showSuccess(response.message || 'Match deleted successfully');
          this.loadMatches();
        },
        error: (error) => {
          this.alertService.showError(error.error?.message || 'Failed to delete match');
        }
      });
    }
  }

  getFormattedDate(date: Date): string {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - new Date(date).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }
}