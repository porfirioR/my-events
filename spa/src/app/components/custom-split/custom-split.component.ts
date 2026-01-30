import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, input, OnInit, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ParticipantSplit } from '../../models/api/travels';

@Component({
  selector: 'app-custom-split',
  templateUrl: './custom-split.component.html',
  styleUrls: ['./custom-split.component.css'],
  imports: [CommonModule, FormsModule, CurrencyPipe],
})
export class CustomSplitComponent {
// Inputs
  participants = input.required<ParticipantSplit[]>();
  operationAmount = input.required<number>();
  splitType = input.required<'Custom' | 'Percentage'>();
  disabled = input(false);

  // Outputs
  participantsChanged = output<ParticipantSplit[]>();

  // Computed
  totalAmount = computed(() => 
    this.participants().reduce((sum, p) => sum + (p.amount || 0), 0)
  );

  totalPercentage = computed(() =>
    this.participants().reduce((sum, p) => sum + (p.percentage || 0), 0)
  );

  Math = Math;

  onAmountChange(memberId: number, event: Event) {
    if (this.disabled()) return;
    
    const input = event.target as HTMLInputElement;
    const amount = parseFloat(input.value) || 0;
    
    const updatedParticipants = this.participants().map(p =>
      p.memberId === memberId ? { ...p, amount } : p
    );
    
    this.participantsChanged.emit(updatedParticipants);
  }

  onPercentageChange(memberId: number, event: Event) {
    if (this.disabled()) return;
    
    const input = event.target as HTMLInputElement;
    const percentage = parseFloat(input.value) || 0;
    
    const updatedParticipants = this.participants().map(p =>
      p.memberId === memberId ? { ...p, percentage } : p
    );
    
    this.participantsChanged.emit(updatedParticipants);
  }

  getInputClasses(participant: ParticipantSplit): string {
    const baseClasses = 'input input-sm';

    if (this.disabled()) {
      return `${baseClasses} input-disabled`;
    }

    if (this.splitType() === 'Custom') {
      const hasValidAmount = (participant.amount || 0) > 0;
      return hasValidAmount ? baseClasses : `${baseClasses} input-error`;
    }

    if (this.splitType() === 'Percentage') {
      const hasValidPercentage = (participant.percentage || 0) > 0;
      return hasValidPercentage ? baseClasses : `${baseClasses} input-error`;
    }

    return baseClasses;
  }

  getTotalClasses(): string {
    if (this.splitType() === 'Custom') {
      const diff = Math.abs(this.totalAmount() - this.operationAmount());
      return diff <= 0.01 ? 'text-success' : 'text-error';
    }

    if (this.splitType() === 'Percentage') {
      const diff = Math.abs(this.totalPercentage() - 100);
      return diff <= 0.01 ? 'text-success' : 'text-error';
    }

    return '';
  }
}
