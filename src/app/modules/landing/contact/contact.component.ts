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


  get f() {
    return this.contactForm.controls;
  }

  onSubmit(): void {
    this.isSubmitted = true;

    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    const payload = this.contactForm.value;

    this.contactService.create(payload).subscribe(result => {
      if(result.isSuccess) {
        this.alertService.createAlert("success", this.translate.instant("MESSAGES.CONTACT_SUCCESS"));
      }
      else {
        this.alertService.createAlert("error", this.translate.instant("MESSAGES.ERROR"));
      }
    })

    this.contactForm.reset();
    this.isSubmitted = false;
  }
}