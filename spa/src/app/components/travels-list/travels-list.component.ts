import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { useLoadingStore, useTravelStore } from '../../store';
import { AlertService, FormatterHelperService } from '../../services';
import { TravelApiModel } from '../../models/api/travels';
import { ConfirmDialogComponent, ConfirmDialogResult } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-travels-list',
  templateUrl: './travels-list.component.html',
  styleUrls: ['./travels-list.component.css'],
  imports: [CommonModule, RouterModule, TranslateModule, ConfirmDialogComponent]
})
export class TravelsListComponent implements OnInit {
  @ViewChild(ConfirmDialogComponent) confirmDialog!: ConfirmDialogComponent;
  private pendingCallback: ((result: ConfirmDialogResult) => void) | null = null;

  private router = inject(Router);
  private alertService = inject(AlertService);
  private formatterService = inject(FormatterHelperService);
  private translate = inject(TranslateService);

  private travelStore = useTravelStore();
  private loadingStore = useLoadingStore();

  protected isLoading = this.loadingStore.isLoading;
  protected filterStatus = signal<string | null>('Active');

  protected travels = computed(() => {
    const statusFilter = this.filterStatus();
    if (!statusFilter) return this.travelStore.travels();
    
    if (statusFilter === 'Active') {
      return this.travelStore.activeTravels();
    } else if (statusFilter === 'Finalized') {
      return this.travelStore.finalizedTravels();
    }
    
    return this.travelStore.travels();
  });

  protected getFormattedDate = this.formatterService.getFormattedDate.bind(this.formatterService);
  protected formatCurrency = this.formatterService.formatCurrency;

  ngOnInit(): void {
    this.travelStore.loadTravels();
  }

  protected setStatusFilter(status: string | null): void {
    this.filterStatus.set(status);
  }

  protected create(): void {
    this.travelStore.clearSelectedTravel();
    this.router.navigate(['/travels/create']);
  }

  protected viewDetail(travel: TravelApiModel): void {
    this.travelStore.selectTravel(travel);
    this.router.navigate(['/travels', travel.id]);
  }

  protected editTravel(travel: TravelApiModel): void {
    this.travelStore.selectTravel(travel);
    this.router.navigate(['/travels', travel.id, 'edit']);
  }

  protected onConfirmResult(result: ConfirmDialogResult): void {
    this.pendingCallback?.(result);
    this.pendingCallback = null;
  }

  protected finalizeTravel(travel: TravelApiModel): void {
    this.pendingCallback = (result) => {
      if (result.confirmed) {
        this.travelStore.finalizeTravel(travel.id);
        this.alertService.showSuccess(this.translate.instant('travels.travelFinalizedSuccess'));
      }
    };
    this.confirmDialog.open({
      title: this.translate.instant('travels.finalizeTravelTitle'),
      message: this.translate.instant('travels.finalizeTravelMessage', { name: travel.name }),
      type: 'warning'
    });
  }

  protected deleteTravel(travel: TravelApiModel): void {
    this.pendingCallback = (result) => {
      if (result.confirmed) {
        this.travelStore.deleteTravel(travel.id);
        this.alertService.showSuccess(this.translate.instant('travels.travelDeletedSuccess'));
      }
    };
    this.confirmDialog.open({
      title: this.translate.instant('travels.deleteTravelTitle'),
      message: this.translate.instant('travels.deleteTravelMessage', { name: travel.name }),
      type: 'error'
    });
  }

  protected getTravelStatusBadgeClass(status: string): string {
    switch(status) {
      case 'Active':
        return 'badge-success';
      case 'Finalized':
        return 'badge-info';
      default:
        return 'badge-neutral';
    }
  }

  protected getTravelStatusIcon(status: string): string {
    switch(status) {
      case 'Active':
        return 'fa-plane-departure';
      case 'Finalized':
        return 'fa-check-circle';
      default:
        return 'fa-question-circle';
    }
  }
}