import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core'
import { RouterModule } from '@angular/router'
import { LocalService } from '../../services'

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  imports: [
    RouterModule,
  ]
})
export class ProfileComponent implements OnInit, OnDestroy {
  @ViewChild('profileModal', { static: true }) profileModal!: ElementRef<HTMLDialogElement>
  protected hasEmail = false
  protected email?: string | null
  protected userId?: number | null

  constructor(
    private readonly localService: LocalService
  ) { }

  ngOnInit(): void {
    this.checkHasEmail()
  }

  ngOnDestroy(): void {
    this.closeDialog()
  }

  public openDialog = (): void => {
    this.checkHasEmail()
    this.profileModal.nativeElement.showModal()
  }

  protected closeDialog = (): void => {
    this.profileModal.nativeElement.close()
  }

  private checkHasEmail = (): void => {
    this.email = this.localService.getEmail()
    this.userId = this.localService.getUserId()
    this.hasEmail = !!this.email
  }
}
