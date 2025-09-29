import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { useCollaboratorStore } from '../../store';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  imports: [
    RouterModule,
  ]
})
export class DashboardComponent {
  private collaboratorStore = useCollaboratorStore();
  
  protected totalCollaborators = this.collaboratorStore.totalCount()
  protected activeCollaborators = this.collaboratorStore.activeCollaborators()
  protected inactiveCollaborators = this.collaboratorStore.inactiveCollaborators()
}
