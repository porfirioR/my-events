import { AsyncPipe } from '@angular/common'
import { Component, computed } from '@angular/core'
import { Store } from '@ngrx/store'
import { RouterModule } from '@angular/router'
import { Observable } from 'rxjs'
import { EventComponent } from '../event/event.component'
import { LoadingSkeletonComponent } from "../loading-skeleton/loading-skeleton.component"
import { EmptyDataComponent } from '../empty-data/empty-data.component'
import { EventApiService, LocalService } from '../../services'
import { EventViewModel } from '../../models/view/event-view-model'
import { DashboardComponent } from "../dashboard/dashboard.component";
import { useLoadingStore } from '../../store'

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  imports: [
    RouterModule,
    EventComponent,
    LoadingSkeletonComponent,
    EmptyDataComponent,
    DashboardComponent,
  ]
})
export class HomeComponent {
  protected eventFollows: EventViewModel[] = []
  protected userLoaded: boolean

  private loadingStore = useLoadingStore();
  protected isLoading = computed((): boolean => this.loadingStore.isLoading());

  constructor(
    private readonly eventApiService: EventApiService,
    private readonly localService: LocalService,
    private readonly store: Store,
  ) {
    const userId = this.localService.getUserId()
    this.userLoaded = userId > 0
    // this.eventApiService.getPublicEvents().subscribe({
    //   next: (eventFollow) => {
    //     const currentDate = new Date()
    //     this.eventFollows = eventFollow.map(x => new EventViewModel(
    //       x.id,
    //       x.name,
    //       x.authorId,
    //       x.authorId !== userId ? '': this.localService.getEmail()!,
    //       x.description,
    //       x.isActive,
    //       new Date(x.date),
    //       x.isPublic,
    //       currentDate
    //     ))
    //     this.store.dispatch(loadingActionGroup.loadingSuccess())
    //   }
    // })
  }
}
