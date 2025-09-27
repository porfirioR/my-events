import { AsyncPipe } from '@angular/common'
import { Component, computed } from '@angular/core'
import { RouterModule } from '@angular/router'
import { Store } from '@ngrx/store'
import { Observable, first, tap } from 'rxjs'
import { EventComponent } from "../event/event.component"
import { LoadingSkeletonComponent } from "../loading-skeleton/loading-skeleton.component"
import { EventApiService, LocalService } from '../../services'
import { EventViewModel } from '../../models/view/event-view-model'
import { EmptyDataComponent } from "../empty-data/empty-data.component";
import { useLoadingStore } from '../../store'

@Component({
  selector: 'app-my-events',
  templateUrl: './my-events.component.html',
  styleUrls: ['./my-events.component.css'],
  imports: [
    AsyncPipe,
    RouterModule,
    EventComponent,
    LoadingSkeletonComponent,
    EmptyDataComponent
  ]
})
export class MyEventsComponent {
  protected eventFollows: EventViewModel[] = []

  private loadingStore = useLoadingStore();
  protected isLoading = computed((): boolean => this.loadingStore.isLoading());

  constructor(
    private readonly eventApiService: EventApiService,
    private readonly localService: LocalService,
  ) {
    const userId = this.localService.getUserId()
    this.eventApiService.getMyEvents(userId).pipe(
      first(),
      tap((eventFollow) => {
        const currentDate = new Date()
        this.eventFollows = eventFollow.map(x => new EventViewModel(
          x.id,
          x.name,
          x.authorId,
          x.authorId !== userId ? '': this.localService.getEmail()!,
          x.description,
          x.isActive,
          new Date(x.date),
          x.isPublic,
          currentDate
        ))
      }
    )).subscribe()
  }

}
