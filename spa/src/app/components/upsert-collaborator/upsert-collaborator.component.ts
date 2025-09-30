import { CommonModule, Location } from '@angular/common';
import { Component, effect, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TextComponent } from '../inputs/text/text.component';
import { CheckBoxInputComponent } from '../inputs/check-box-input/check-box-input.component';
import { CollaboratorFormGroup } from '../../models/forms/collaborator-form-group';
import { CollaboratorApiModel, CollaboratorApiRequest } from '../../models/api';
import { useCollaboratorStore, useLoadingStore } from '../../store';
import { AlertService } from '../../services';

@Component({
  selector: 'app-upsert-collaborator',
  templateUrl: './upsert-collaborator.component.html',
  styleUrls: ['./upsert-collaborator.component.css'],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    TextComponent,
    CheckBoxInputComponent,
  ]
})
export class UpsertCollaboratorComponent implements OnInit {
  private router = inject(Router);
  private alertService = inject(AlertService);
  private activatedRoute = inject(ActivatedRoute);

  private collaboratorStore = useCollaboratorStore();
  private loadingStore = useLoadingStore();
  protected isLoading = this.loadingStore.isLoading;
  protected selectedCollaborator = this.collaboratorStore.selectedCollaborator;

  protected formGroup: FormGroup<CollaboratorFormGroup>
  protected isEditMode = false;
  protected collaborator?: CollaboratorApiModel

  constructor() {
    this.formGroup = new FormGroup<CollaboratorFormGroup>({
      name: new FormControl('', [Validators.required, Validators.minLength(2)]),
      surname: new FormControl('', [Validators.required, Validators.minLength(2)]),
      email: new FormControl('', [Validators.email]),
      isActive: new FormControl(true, [Validators.required]),
    })

    effect(() => {
      this.collaborator = this.selectedCollaborator();
      if (this.collaborator && this.isEditMode) {
        this.formGroup.patchValue({
          name: this.collaborator.name,
          surname: this.collaborator.surname,
          email: this.collaborator.email,
        });
        if (this.collaborator?.type == 'EXTERNAL') {
          this.formGroup.controls.email.disable()
        }
      }
    });
  }

  ngOnInit() {
    const id = this.activatedRoute.snapshot.params['id'];
    if (id) {
      this.isEditMode = true;
      this.collaboratorStore.loadCollaboratorById(+id);
    } else {
      this.collaboratorStore.clearSelectedCollaborator();
    }
  }

  protected save = (event?: Event): void => {
    event?.preventDefault()
    if (this.formGroup.invalid) {
      this.formGroup.markAllAsTouched();
      return
    }

    const request = new CollaboratorApiRequest(
      this.formGroup.value.name!,
      this.formGroup.value.surname!,
      this.formGroup.value.email,
      this.selectedCollaborator()?.id.toString() ?? null
    );

    this.collaboratorStore.upsertCollaborator(request).subscribe({
      next: () => {
        this.alertService.showSuccess('Event save successfully')
        this.exit()
      }, error: (e) => {
        this.alertService.showError(request.id ? 'Failed to update collaborator' : 'Failed to create collaborator')
        this.formGroup.enable()
        throw e
      }
    })
  }

  protected exit = () => this.router.navigate(['/collaborators']);

}
