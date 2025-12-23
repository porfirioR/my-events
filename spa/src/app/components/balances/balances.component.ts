import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Location } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { useLoadingStore, useTransactionStore } from '../../store';
import { FormatterHelperService } from '../../services';

@Component({
  selector: 'app-balances',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    RouterModule,
  ],
  templateUrl: './balances.component.html',
  styleUrls: ['./balances.component.css']
})
export class BalancesComponent implements OnInit {
  private readonly transactionStore = useTransactionStore();
  private readonly loadingStore = useLoadingStore();
  private readonly location = inject(Location);
  private formatterService = inject(FormatterHelperService);

  // Signals
  protected isLoading = this.loadingStore.isLoading;
  protected expandedBalanceId = signal<number | null>(null);

  // Computed from store
  protected balances = computed(() => this.transactionStore.balances());
  protected totalBalance = computed(() => this.transactionStore.totalBalance());
  protected totalTheyOwe = computed(() => this.transactionStore.totalTheyOwe());
  protected totalIOwe = computed(() => this.transactionStore.totalIOwe());

  // For Math functions in template
  protected math = Math;
  protected formatCurrency =  this.formatterService.formatCurrency
  protected getInitials = FormatterHelperService.getInitials

  ngOnInit(): void {
    this.transactionStore.loadBalances();
  }

  protected toggleBalanceDetails(collaboratorId: number): void {
    if (this.expandedBalanceId() === collaboratorId) {
      this.expandedBalanceId.set(null);
    } else {
      this.expandedBalanceId.set(collaboratorId);
    }
  }

  protected goBack(): void {
    this.location.back();
  }

}