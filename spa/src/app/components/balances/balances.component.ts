import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Location } from '@angular/common';
import { useTransactionStore } from '../../store';
import { HelperService } from '../../services';

@Component({
  selector: 'app-balances',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
  ],
  templateUrl: './balances.component.html',
  styleUrls: ['./balances.component.css']
})
export class BalancesComponent implements OnInit {
  private readonly transactionStore = useTransactionStore();
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  // Signals
  isLoading = signal<boolean>(false);
  expandedBalanceId = signal<number | null>(null);

  // Computed from store
  balances = computed(() => this.transactionStore.balances());
  totalBalance = computed(() => this.transactionStore.totalBalance());
  totalTheyOwe = computed(() => this.transactionStore.totalTheyOwe());
  totalIOwe = computed(() => this.transactionStore.totalIOwe());

  // For Math functions in template
  protected Math = Math;

  ngOnInit(): void {
    this.loadBalances();
  }

  private loadBalances(): void {
    this.isLoading.set(true);
    this.transactionStore.loadBalances();
    setTimeout(() => this.isLoading.set(false), 500);
  }

  // ========== Actions ==========
  protected toggleBalanceDetails(collaboratorId: number): void {
    if (this.expandedBalanceId() === collaboratorId) {
      this.expandedBalanceId.set(null);
    } else {
      this.expandedBalanceId.set(collaboratorId);
    }
  }

  protected viewTransactionsWithCollaborator(collaboratorId: number): void {
    // Navigate to transactions filtered by this collaborator
    this.router.navigate(['/transactions'], {
      queryParams: { collaboratorId }
    });
  }

  protected createTransaction(): void {
    this.router.navigate(['/transactions/new']);
  }

  protected goBack(): void {
    this.location.back();
  }

  // ========== Formatters ==========
  protected formatCurrency = (amount: number): string => HelperService.formatCurrency(amount)

  protected getInitials(fullName: string): string {
    const parts = fullName.split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return fullName.substring(0, 2).toUpperCase();
  }
}