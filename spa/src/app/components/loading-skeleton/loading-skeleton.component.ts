import { ChangeDetectionStrategy, Component } from '@angular/core'

@Component({
  selector: 'app-loading-skeleton',
  templateUrl: './loading-skeleton.component.html',
  styleUrls: ['./loading-skeleton.component.css'],
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingSkeletonComponent {

  constructor() { }

}
