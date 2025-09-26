import { CommonModule, Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TextComponent } from '../inputs/text/text.component';
import { CheckBoxInputComponent } from '../inputs/check-box-input/check-box-input.component';
import { DateInputComponent } from '../inputs/date-input/date-input.component';
import { TextAreaInputComponent } from '../inputs/text-area-input/text-area-input.component';
import { CollaboratorFormGroup } from '../../models/forms/collaborator-form-group';
import { CollaboratorApiModel } from '../../models/api';

@Component({
  selector: 'app-upsert-collaborator',
  templateUrl: './upsert-collaborator.component.html',
  styleUrls: ['./upsert-collaborator.component.css'],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    TextComponent,
    TextAreaInputComponent,
    CheckBoxInputComponent,
    DateInputComponent,
  ]
})
export class UpsertCollaboratorComponent implements OnInit {
  protected formGroup: FormGroup<CollaboratorFormGroup>

  protected title: string = 'Collaborator'
  protected collaborator?: CollaboratorApiModel
  protected saving = false

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly location: Location,

  ) {
    this.collaborator = this.activatedRoute.snapshot.data['collaborator']
    this.title = this.collaborator ? 'Update Collaborator' : 'Create Collaborator'
    this.formGroup = new FormGroup<CollaboratorFormGroup>({
      name: new FormControl(this.collaborator?.name ?? null, [Validators.required]),
      surname: new FormControl(this.collaborator?.surname ?? null, [Validators.required]),
      email: new FormControl(this.collaborator?.email ?? null, [Validators.email]),
      isActive: new FormControl(this.collaborator?.isActive ?? false, [Validators.required]),
    })
    if (this.collaborator?.type == 'EXTERNAL') {
      this.formGroup.controls.email.disable()
    }
  }

  ngOnInit() {
  }

  protected save = (event?: Event): void => {
    event?.preventDefault()
    if (this.formGroup.invalid) {
      return
    }
    this.saving = true
    this.formGroup.disable()
    //todo use store, signal
    // const request$ = this.collaborator ? this.update() : this.create()
    // request$.subscribe({
    //   next: () => {
    //     this.alertService.showSuccess('Event save successfully')
    //     this.cancel()
    //   }, error: (e) => {
    //     this.formGroup.enable()
    //     this.saving = false
    //     throw e
    //   }
    // })
  }

  protected cancel = (): void => this.location.back()

}
