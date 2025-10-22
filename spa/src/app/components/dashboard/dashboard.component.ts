import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { useCollaboratorStore, useTransactionStore } from '../../store';

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
  private transactionStore = useTransactionStore();

  unsettledTransactions = this.transactionStore.unsettledTransactions
  myCreatedTransactions = this.transactionStore.myCreatedTransactions
  settledTransactions = this.transactionStore.settledTransactions

  protected totalCollaborators = this.collaboratorStore.totalCount
  protected activeCollaborators = this.collaboratorStore.activeCollaborators
  protected inactiveCollaborators = this.collaboratorStore.inactiveCollaborators

  ngOnInit(): void {
    if (this.collaboratorStore.totalCount() === 0) {
      this.collaboratorStore.loadCollaborators();
    }
    this.transactionStore.loadTransactions()
  }

}
