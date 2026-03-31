import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslationService } from 'src/app/services/translation.service';

@Component({
  selector: 'app-contact-view',
  templateUrl: './contact-view.component.html',
  styleUrl: './contact-view.component.css'
})
export class ContactViewComponent {
  readonly i18n = inject(TranslationService);
  private fb = inject(FormBuilder);

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

    // Burada servis çağrısı yapabilirsin
    // this.contactService.sendContactForm(payload).subscribe(...)

    this.contactForm.reset();
    this.isSubmitted = false;
  }
}