import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-empty-data',
  templateUrl: './empty-data.component.html',
  styleUrls: ['./empty-data.component.css'],
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyDataComponent {

  constructor() { }

}
