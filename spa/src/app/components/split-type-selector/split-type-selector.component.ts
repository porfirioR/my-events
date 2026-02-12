import { Component, input, OnInit, output } from '@angular/core';
import { SplitType, TravelParticipantType } from '../../models/enums';

@Component({
  selector: 'app-split-type-selector',
  templateUrl: './split-type-selector.component.html',
  styleUrls: ['./split-type-selector.component.css']
})
export class SplitTypeSelectorComponent {
  protected selectedParticipantType = input<TravelParticipantType>(TravelParticipantType.All);
  protected selectedSplitType = input<SplitType>(SplitType.Equal);
  protected disabled = input(false);

  protected travelParticipantType = TravelParticipantType
  protected splitType = SplitType

  // Outputs
  protected participantTypeChanged = output<TravelParticipantType>();
  protected splitTypeChanged = output<SplitType>();

  protected selectParticipantType(type: TravelParticipantType) {
    if (this.disabled()) return;
    this.participantTypeChanged.emit(type);
  }

  protected selectSplitType(type: SplitType) {
    if (this.disabled()) return;
    this.splitTypeChanged.emit(type);
  }

  protected getParticipantTypeClasses(type: TravelParticipantType): string {
    const baseClasses = 'btn';

    if (this.disabled()) {
      return `${baseClasses} btn-disabled`;
    }

    if (this.selectedParticipantType() === type) {
      return `${baseClasses} btn-primary`;
    }
    
    return `${baseClasses} btn-outline`;
  }

  protected getSplitTypeClasses(type: SplitType): string {
    const baseClasses = 'btn btn-outline';

    if (this.disabled()) {
      return `${baseClasses} btn-disabled`;
    }

    if (this.selectedSplitType() === type) {
      return `${baseClasses} btn-primary border-primary bg-primary text-primary-content`;
    }

    return baseClasses;
  }
}
