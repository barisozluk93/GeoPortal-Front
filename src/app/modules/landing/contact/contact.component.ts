import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ContactService } from './contact.service';
import { AlertService } from 'src/app/_metronic/partials/layout/alert/alert.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss'
})
export class ContactComponent {
  private fb = inject(FormBuilder);
  private readonly contactService = inject(ContactService);
  private readonly alertService = inject(AlertService);
  private readonly translate = inject(TranslateService);

  contactForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    organization: [''],
    businessEmail: ['', [Validators.required, Validators.email]],
    subject: ['', [Validators.required, Validators.minLength(3)]],
    message: ['', [Validators.required, Validators.minLength(10)]]
  });

  isSubmitted = false;
  isLoading = false;

  get f() {
    return this.contactForm.controls;
  }

  onSubmit(): void {
    this.isSubmitted = true;
    this.contactForm.markAllAsTouched();

    if (this.contactForm.invalid || this.isLoading) {
      return;
    }

    this.isLoading = true;

    const payload = this.contactForm.value;

    this.contactService.create(payload).subscribe({
      next: result => {
        if (result?.isSuccess) {
          this.alertService.createAlert(
            'success',
            this.translate.instant('MESSAGES.CONTACT_SUCCESS')
          );

          this.contactForm.reset();
          this.isSubmitted = false;
        } else {
          this.alertService.createAlert(
            'danger',
            this.translate.instant('MESSAGES.ERROR')
          );
        }

        this.isLoading = false;
      },
      error: () => {
        this.alertService.createAlert(
          'danger',
          this.translate.instant('MESSAGES.ERROR')
        );

        this.isLoading = false;
      }
    });
  }
}