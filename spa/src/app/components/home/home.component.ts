import { Component } from '@angular/core'
import { RouterModule } from '@angular/router'
import { LoadingSkeletonComponent } from "../loading-skeleton/loading-skeleton.component"
import { HeaderComponent } from "../header/header.component";
import { DashboardComponent } from "../dashboard/dashboard.component";
import { EventViewModel } from '../../models/view/event-view-model'
import { useAuthStore, useLoadingStore } from '../../store'

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  imports: [
    RouterModule,
    LoadingSkeletonComponent,
    DashboardComponent,
    HeaderComponent
  ]
})
export class HomeComponent {
  private authStore = useAuthStore();
  private loadingStore = useLoadingStore();
  protected eventFollows: EventViewModel[] = []
  protected isLoading = this.loadingStore.isLoading;
  protected currentUser = this.authStore.currentUser;
  protected userLoaded = this.authStore.isLoggedIn;

  constructor() { }
}
