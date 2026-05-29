import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Subscription, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';

import { AuthService } from '../../services/auth.service';
import { ConfirmPasswordValidator } from './confirm-password.validator';
import { UserModel } from 'src/app/modules/user-management/models/user.model';
import { OrganizationModel } from 'src/app/modules/organization-management/models/organization.model';
import { OrganizationManagementService } from 'src/app/modules/organization-management/organization-management.service';

enum ErrorStates {
  NotSubmitted,
  HasError,
  NoError,
}

export type RegistrationTabsType =
  | 'bireysel'
  | 'kurumsal';

@Component({
  selector: 'app-registration',
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.scss']
})
export class RegistrationComponent implements OnInit, OnDestroy {
  registrationForm: FormGroup;
  errorState: ErrorStates = ErrorStates.NotSubmitted;
  errorStates = ErrorStates;
  isLoading$: Observable<boolean>;

  activeTabId: RegistrationTabsType = 'bireysel';
  organizations: OrganizationModel[] = [];
  readonly OTHER_ORGANIZATION_ID = -1;

  private unsubscribe: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private organizationManagementService: OrganizationManagementService,
    private translate: TranslateService
  ) {
    this.isLoading$ = this.authService.isLoading$;

    if (this.authService.currentUserValue) {
      this.router.navigate(['/']);
    }
  }

  ngOnInit(): void {
    this.initForm();
    this.getOrganizations();
    this.updateCorporateValidators();
    this.listenOrganizationChanges();
  }

  get f() {
    return this.registrationForm.controls;
  }

  isInvalid(controlName: string): boolean {
    const control = this.registrationForm.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  get isCorporate(): boolean {
    return this.activeTabId == 'kurumsal';
  }

  get isOtherSelected(): boolean {
    return Number(this.f['organizationId']?.value) == this.OTHER_ORGANIZATION_ID;
  }

  initForm() {
    this.registrationForm = this.fb.group(
      {
        name: [
          '',
          Validators.compose([
            Validators.required,
          ]),
        ],
        surname: [
          '',
          Validators.compose([
            Validators.required,
          ]),
        ],
        email: [
          '',
          Validators.compose([
            Validators.required,
            Validators.email,
            Validators.minLength(3),
            Validators.maxLength(320),
          ]),
        ],
        password: [
          '',
          Validators.compose([
            Validators.required,
            Validators.minLength(3),
            Validators.maxLength(100),
          ]),
        ],
        cPassword: [
          '',
          Validators.compose([
            Validators.required,
            Validators.minLength(3),
            Validators.maxLength(100),
          ]),
        ],
        phone: [
          '',
          Validators.compose([
            Validators.required,
            Validators.pattern(/^\(\d{3}\)\s\d{3}\s\d{2}\s\d{2}$/)
          ]),
        ],
        username: [
          '',
          Validators.compose([
            Validators.required,
          ]),
        ],
        isProducer: [
          false,
          Validators.compose([
            Validators.required,
          ]),
        ],

        organizationId: [null],
        orgName: [''],
        taxNo: [''],
        taxOffice: [''],
        orgPhone: [''],
        orgEmail: [''],
      },
      {
        validator: ConfirmPasswordValidator.MatchPassword,
      }
    );
  }

  listenOrganizationChanges() {
    const orgChangeSub = this.f['organizationId'].valueChanges.subscribe(() => {
      this.onOrganizationChange();
    });

    this.unsubscribe.push(orgChangeSub);
  }

  getOrganizations() {
    const sub = this.organizationManagementService.all().subscribe({
      next: (result) => {
        const otherOption: OrganizationModel = {
          id: this.OTHER_ORGANIZATION_ID,
          name: this.translate.instant('AUTH.REGISTER.OTHER_ORGANIZATION'),
          taxNo: '',
          taxOffice: '',
          isDeleted: false,
          isSystemData: false,
          phone: '',
          email: ''
        };

        if (result?.isSuccess && result.data) {
          this.organizations = [...result.data, otherOption];
        } else {
          this.organizations = [otherOption];
        }
      },
      error: () => {
        this.organizations = [
          {
            id: this.OTHER_ORGANIZATION_ID,
            name: this.translate.instant('AUTH.REGISTER.OTHER_ORGANIZATION'),
            taxNo: '',
            taxOffice: '',
            isDeleted: false,
            isSystemData: false,
            phone: '',
            email: ''
          }
        ];
      }
    });

    this.unsubscribe.push(sub);
  }

  setActiveTabId(tabId: RegistrationTabsType) {
    this.activeTabId = tabId;

    this.registrationForm.patchValue({
      organizationId: null,
      orgName: '',
      taxNo: '',
      taxOffice: '',
      orgPhone: '',
      orgEmail: ''
    });

    this.f['organizationId'].markAsPristine();
    this.f['orgName'].markAsPristine();
    this.f['taxNo'].markAsPristine();
    this.f['taxOffice'].markAsPristine();
    this.f['orgPhone'].markAsPristine();
    this.f['orgEmail'].markAsPristine();

    this.f['organizationId'].markAsUntouched();
    this.f['orgName'].markAsUntouched();
    this.f['taxNo'].markAsUntouched();
    this.f['taxOffice'].markAsUntouched();
    this.f['orgPhone'].markAsUntouched();
    this.f['orgEmail'].markAsUntouched();

    this.updateCorporateValidators();
  }

  onOrganizationChange() {
    if (!this.isOtherSelected) {
      this.registrationForm.patchValue({
        orgName: '',
        taxNo: '',
        taxOffice: '',
        orgPhone: '',
        orgEmail: ''
      }, { emitEvent: false });

      this.f['orgName'].markAsPristine();
      this.f['taxNo'].markAsPristine();
      this.f['taxOffice'].markAsPristine();
      this.f['orgPhone'].markAsPristine();
      this.f['orgEmail'].markAsPristine();

      this.f['orgName'].markAsUntouched();
      this.f['taxNo'].markAsUntouched();
      this.f['taxOffice'].markAsUntouched();
      this.f['orgPhone'].markAsUntouched();
      this.f['orgEmail'].markAsUntouched();
    }

    this.updateCorporateValidators();
  }

  updateCorporateValidators() {
    const organizationIdControl = this.f['organizationId'];
    const orgNameControl = this.f['orgName'];
    const taxNoControl = this.f['taxNo'];
    const taxOfficeControl = this.f['taxOffice'];
    const orgPhoneControl = this.f['orgPhone'];
    const orgEmailControl = this.f['orgEmail'];

    organizationIdControl.clearValidators();
    orgNameControl.clearValidators();
    taxNoControl.clearValidators();
    taxOfficeControl.clearValidators();
    orgPhoneControl.clearValidators();
    orgEmailControl.clearValidators();

    if (this.isCorporate) {
      organizationIdControl.setValidators([Validators.required]);

      if (this.isOtherSelected) {
        orgNameControl.setValidators([Validators.required]);
        taxNoControl.setValidators([Validators.required]);
        taxOfficeControl.setValidators([Validators.required]);
        orgPhoneControl.setValidators([
          Validators.pattern(/^\(\d{3}\)\s\d{3}\s\d{2}\s\d{2}$/)
        ]);
        orgEmailControl.setValidators([Validators.email]);
      }
    }

    organizationIdControl.updateValueAndValidity({ emitEvent: false });
    orgNameControl.updateValueAndValidity({ emitEvent: false });
    taxNoControl.updateValueAndValidity({ emitEvent: false });
    taxOfficeControl.updateValueAndValidity({ emitEvent: false });
    orgPhoneControl.updateValueAndValidity({ emitEvent: false });
    orgEmailControl.updateValueAndValidity({ emitEvent: false });
  }

  submit() {
    if (this.registrationForm.invalid) {
      this.registrationForm.markAllAsTouched();
      return;
    }

    const formValue = this.registrationForm.getRawValue();

    const newUser = new UserModel();
    newUser.name = formValue.name;
    newUser.surname = formValue.surname;
    newUser.email = formValue.email;
    newUser.password = formValue.password;
    newUser.phone = formValue.phone;
    newUser.username = formValue.username;
    newUser.isProducer = formValue.isProducer;
    newUser.organizations = [];
    newUser.roles = [];

    if (this.isCorporate) {
      if (Number(formValue.organizationId) === this.OTHER_ORGANIZATION_ID) {
        newUser.organization = {
          id: 0,
          name: formValue.orgName,
          taxNo: formValue.taxNo,
          taxOffice: formValue.taxOffice,
          phone: formValue.orgPhone,
          email: formValue.orgEmail,
          isDeleted: false,
          isSystemData: false,
        };

        newUser.organizations = [this.OTHER_ORGANIZATION_ID];
      } else if (formValue.organizationId) {
        newUser.organizations = [Number(formValue.organizationId)];
      }
    }

    const registrationSubscr = this.authService
      .registration(newUser)
      .pipe(first())
      .subscribe((result: boolean) => {
        this.errorState = result ? ErrorStates.NoError : ErrorStates.HasError;

        if (result) {
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 2000);
        }
      });

    this.unsubscribe.push(registrationSubscr);
  }

  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }

  onBrandClick() {
    this.router.navigate(['/landing/data']);
  }
}