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

export type RegistrationTabsType = 'bireysel' | 'kurumsal';

interface SectorOption {
  label: string;
  value: string;
  translationKey: string;
}

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
  sectors: SectorOption[] = [];

  readonly OTHER_ORGANIZATION_ID = -1;

  private readonly sectorDefinitions: Array<Omit<SectorOption, 'label'>> = [
    { value: 'Defense Industry', translationKey: 'AUTH.REGISTER.SECTORS.DEFENSE_INDUSTRY' },
    { value: 'Public Institution', translationKey: 'AUTH.REGISTER.SECTORS.PUBLIC_INSTITUTION' },
    { value: 'Municipality', translationKey: 'AUTH.REGISTER.SECTORS.MUNICIPALITY' },
    { value: 'Agriculture', translationKey: 'AUTH.REGISTER.SECTORS.AGRICULTURE' },
    { value: 'Forestry', translationKey: 'AUTH.REGISTER.SECTORS.FORESTRY' },
    { value: 'Mining', translationKey: 'AUTH.REGISTER.SECTORS.MINING' },
    { value: 'Energy', translationKey: 'AUTH.REGISTER.SECTORS.ENERGY' },
    { value: 'Oil and Gas', translationKey: 'AUTH.REGISTER.SECTORS.OIL_AND_GAS' },
    { value: 'Construction', translationKey: 'AUTH.REGISTER.SECTORS.CONSTRUCTION' },
    { value: 'Mapping and GIS', translationKey: 'AUTH.REGISTER.SECTORS.MAPPING_AND_GIS' },
    { value: 'Telecommunication', translationKey: 'AUTH.REGISTER.SECTORS.TELECOMMUNICATION' },
    { value: 'Transportation and Logistics', translationKey: 'AUTH.REGISTER.SECTORS.TRANSPORTATION_AND_LOGISTICS' },
    { value: 'Environment and Climate', translationKey: 'AUTH.REGISTER.SECTORS.ENVIRONMENT_AND_CLIMATE' },
    { value: 'Disaster Management', translationKey: 'AUTH.REGISTER.SECTORS.DISASTER_MANAGEMENT' },
    { value: 'Academia and Research', translationKey: 'AUTH.REGISTER.SECTORS.ACADEMIA_AND_RESEARCH' },
    { value: 'Banking and Finance', translationKey: 'AUTH.REGISTER.SECTORS.BANKING_AND_FINANCE' },
    { value: 'Insurance', translationKey: 'AUTH.REGISTER.SECTORS.INSURANCE' },
    { value: 'Health', translationKey: 'AUTH.REGISTER.SECTORS.HEALTH' },
    { value: 'Tourism', translationKey: 'AUTH.REGISTER.SECTORS.TOURISM' },
    { value: 'Technology', translationKey: 'AUTH.REGISTER.SECTORS.TECHNOLOGY' },
    { value: 'Software', translationKey: 'AUTH.REGISTER.SECTORS.SOFTWARE' },
    { value: 'Satellite and Space', translationKey: 'AUTH.REGISTER.SECTORS.SATELLITE_AND_SPACE' },
    { value: 'Engineering', translationKey: 'AUTH.REGISTER.SECTORS.ENGINEERING' },
    { value: 'Other', translationKey: 'AUTH.REGISTER.SECTORS.OTHER' },
  ];

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
    this.initSectors();
    this.initForm();
    this.getOrganizations();
    this.updateCorporateValidators();
    this.listenOrganizationChanges();
    this.listenLanguageChanges();
  }

  get f() {
    return this.registrationForm.controls;
  }

  isInvalid(controlName: string): boolean {
    const control = this.registrationForm.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  get isCorporate(): boolean {
    return this.activeTabId === 'kurumsal';
  }

  get isOtherSelected(): boolean {
    return Number(this.f['organizationId']?.value) === this.OTHER_ORGANIZATION_ID;
  }

  initSectors(): void {
    this.sectors = this.sectorDefinitions.map((sector) => ({
      ...sector,
      label: this.translate.instant(sector.translationKey),
    }));
  }

  initForm(): void {
    this.registrationForm = this.fb.group(
      {
        name: ['', Validators.required],
        surname: ['', Validators.required],
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
            Validators.pattern(/^\(\d{3}\)\s\d{3}\s\d{2}\s\d{2}$/),
          ]),
        ],
        username: ['', Validators.required],

        organizationId: [null],
        sector: ['', Validators.required],
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

  listenOrganizationChanges(): void {
    const orgChangeSub = this.f['organizationId'].valueChanges.subscribe(() => {
      this.onOrganizationChange();
    });

    this.unsubscribe.push(orgChangeSub);
  }

  listenLanguageChanges(): void {
    const langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.initSectors();
      this.refreshOtherOrganizationLabel();
    });

    this.unsubscribe.push(langChangeSub);
  }

  refreshOtherOrganizationLabel(): void {
    this.organizations = this.organizations.map((organization) => {
      if (Number(organization.id) !== this.OTHER_ORGANIZATION_ID) {
        return organization;
      }

      return {
        ...organization,
        name: this.translate.instant('AUTH.REGISTER.OTHER_ORGANIZATION'),
      };
    });
  }

  getOrganizations(): void {
    const sub = this.organizationManagementService.all().subscribe({
      next: (result) => {
        const otherOption: OrganizationModel = this.getOtherOrganizationOption();

        if (result?.isSuccess && result.data) {
          this.organizations = [...result.data, otherOption];
        } else {
          this.organizations = [otherOption];
        }
      },
      error: () => {
        this.organizations = [this.getOtherOrganizationOption()];
      },
    });

    this.unsubscribe.push(sub);
  }

  getOtherOrganizationOption(): OrganizationModel {
    return {
      id: this.OTHER_ORGANIZATION_ID,
      name: this.translate.instant('AUTH.REGISTER.OTHER_ORGANIZATION'),
      taxNo: '',
      taxOffice: '',
      isDeleted: false,
      isSystemData: false,
      phone: '',
      email: '',
    };
  }

  setActiveTabId(tabId: RegistrationTabsType): void {
    this.activeTabId = tabId;

    this.registrationForm.patchValue({
      organizationId: null,
      orgName: '',
      taxNo: '',
      taxOffice: '',
      orgPhone: '',
      orgEmail: '',
    });

    this.resetCorporateControlsState();
    this.updateCorporateValidators();
  }

  onOrganizationChange(): void {
    if (!this.isOtherSelected) {
      this.registrationForm.patchValue(
        {
          orgName: '',
          taxNo: '',
          taxOffice: '',
          orgPhone: '',
          orgEmail: '',
        },
        { emitEvent: false }
      );

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

  resetCorporateControlsState(): void {
    const controlNames = [
      'organizationId',
      'orgName',
      'taxNo',
      'taxOffice',
      'orgPhone',
      'orgEmail',
    ];

    controlNames.forEach((controlName) => {
      this.f[controlName].markAsPristine();
      this.f[controlName].markAsUntouched();
    });
  }

  updateCorporateValidators(): void {
    const organizationIdControl = this.f['organizationId'];
    const sectorControl = this.f['sector'];
    const orgNameControl = this.f['orgName'];
    const taxNoControl = this.f['taxNo'];
    const taxOfficeControl = this.f['taxOffice'];
    const orgPhoneControl = this.f['orgPhone'];
    const orgEmailControl = this.f['orgEmail'];

    organizationIdControl.clearValidators();
    sectorControl.clearValidators();
    orgNameControl.clearValidators();
    taxNoControl.clearValidators();
    taxOfficeControl.clearValidators();
    orgPhoneControl.clearValidators();
    orgEmailControl.clearValidators();

    sectorControl.setValidators([Validators.required]);

    if (this.isCorporate) {
      organizationIdControl.setValidators([Validators.required]);

      if (this.isOtherSelected) {
        orgNameControl.setValidators([Validators.required]);
        taxNoControl.setValidators([Validators.required]);
        taxOfficeControl.setValidators([Validators.required]);
        orgPhoneControl.setValidators([
          Validators.pattern(/^\(\d{3}\)\s\d{3}\s\d{2}\s\d{2}$/),
        ]);
        orgEmailControl.setValidators([Validators.email]);
      }
    }

    organizationIdControl.updateValueAndValidity({ emitEvent: false });
    sectorControl.updateValueAndValidity({ emitEvent: false });
    orgNameControl.updateValueAndValidity({ emitEvent: false });
    taxNoControl.updateValueAndValidity({ emitEvent: false });
    taxOfficeControl.updateValueAndValidity({ emitEvent: false });
    orgPhoneControl.updateValueAndValidity({ emitEvent: false });
    orgEmailControl.updateValueAndValidity({ emitEvent: false });
  }

  submit(): void {
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
    newUser.organizations = [];
    newUser.roles = [];

    // Sector hem bireysel hem kurumsal için zorunlu ve her zaman gönderilir.
    (newUser as any).sector = formValue.sector;

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

  ngOnDestroy(): void {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }

  onBrandClick(): void {
    this.router.navigate(['/landing/map']);
  }
}