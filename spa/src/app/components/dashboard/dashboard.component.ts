import { Component, effect, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { useCollaboratorStore, useLoadingStore } from '../../store';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  imports: [
    RouterModule,
  ]
})
export class DashboardComponent implements OnInit {
  private collaboratorStore = useCollaboratorStore();

  protected totalCollaborators = this.collaboratorStore.totalCount
  protected activeCollaborators = this.collaboratorStore.activeCollaborators
  protected inactiveCollaborators = this.collaboratorStore.inactiveCollaborators

  ngOnInit() {
    if (this.collaboratorStore.totalCount() === 0) {
      this.collaboratorStore.loadCollaborators();
    }
  }

}
