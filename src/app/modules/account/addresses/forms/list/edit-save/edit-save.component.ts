import { AfterViewInit, Component, EventEmitter, OnInit, Output } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { AlertService } from "src/app/_metronic/partials/layout/alert/alert.service";
import { TranslateService } from "@ngx-translate/core";
import { forkJoin } from "rxjs";
import { UserManagementService } from "src/app/modules/user-management/user-management.service";
import { UserAddressModel } from "src/app/modules/user-management/models/user-address.model";
import { AuthService } from "src/app/modules/auth/services/auth.service";
import { OrganizationManagementService } from "src/app/modules/organization-management/organization-management.service";

@Component({
  selector: 'app-address-editsave',
  templateUrl: './edit-save.component.html',
  styleUrls: ['./edit-save.component.scss'],
})
export class AddressEditSaveComponent implements OnInit, AfterViewInit {
  @Output() isSuccess: EventEmitter<boolean> = new EventEmitter<boolean>();

  isModalOpen: boolean = false;
  modalTitle: string = '';
  form: FormGroup;

  invoiceTypes: any[] = [];
  invoiceTypesTR: any[] = [
    { id: 1, name: "Bireysel", isDeleted: false },
    { id: 2, name: "Kurumsal", isDeleted: false },
  ];
  invoiceTypesEN: any[] = [
    { id: 1, name: "Individual", isDeleted: false },
    { id: 2, name: "Corporate", isDeleted: false },
  ];

  constructor(
    private fb: FormBuilder,
    private userManagementService: UserManagementService,
    private authService: AuthService,
    private translate: TranslateService,
    private alertService: AlertService,
    private organizationManagementService: OrganizationManagementService
  ) { }

  get f() {
    return this.form.controls;
  }

  initForm() {
    this.form = this.fb.group({
      id: 0,
      invoiceType: [
        undefined,
        Validators.required,
      ],
      name: [
        "",
        Validators.required,
      ],
      surname: [
        "",
        Validators.required,
      ],
      phone: [
        "",
        Validators.compose([
          Validators.required,
          Validators.pattern(/^\(\d{3}\)\s\d{3}\s\d{2}\s\d{2}$/)
        ]),
      ],
      country: [
        "",
        Validators.required,
      ],
      city: [
        "",
        Validators.required,
      ],
      addressHeader: [
        "",
        Validators.required,
      ],
      address: [
        "",
        Validators.required,
      ],
      district: [
        undefined,
        Validators.required,
      ],
      userId: [
        undefined,
        Validators.required,
      ],
      vkn: [
        undefined
      ],
      vergiDairesi: [
        undefined
      ],
      firmaAdi: [
        undefined
      ],
      isDeleted: false
    });
  }

  ngOnInit(): void {
    this.initForm();
    this.updateTranslationsAndColumns();
  }

  ngAfterViewInit() {
    this.form.get("invoiceType")?.valueChanges.subscribe(value => {
      if (value == 2) {
        this.form.get('vkn')?.setValidators([
          Validators.required,
        ]);
        this.form.get('vkn')?.updateValueAndValidity();

        this.form.get('vergiDairesi')?.setValidators([
          Validators.required,
        ]);
        this.form.get('vergiDairesi')?.updateValueAndValidity();

        this.form.get('firmaAdi')?.setValidators([
          Validators.required,
        ]);
        this.form.get('firmaAdi')?.updateValueAndValidity();
      } else {
        this.form.get('vkn')?.setValue(undefined);
        this.form.get('vkn')?.clearValidators();
        this.form.get('vkn')?.updateValueAndValidity();

        this.form.get('vergiDairesi')?.setValue(undefined);
        this.form.get('vergiDairesi')?.clearValidators();
        this.form.get('vergiDairesi')?.updateValueAndValidity();

        this.form.get('firmaAdi')?.setValue(undefined);
        this.form.get('firmaAdi')?.clearValidators();
        this.form.get('firmaAdi')?.updateValueAndValidity();
      }
    });
  }

  updateTranslationsAndColumns(): void {
    this.translate.onLangChange.subscribe(() => {
      this.updateInvoiceTypeList();
    });

    this.updateInvoiceTypeList();
  }

  updateInvoiceTypeList(): void {
    this.translate.get('LANG').subscribe((translation: string) => {
      if (translation === 'tr') {
        this.invoiceTypes = this.invoiceTypesTR;
      } else {
        this.invoiceTypes = this.invoiceTypesEN;
      }
    });
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  private resetInvoiceLockedFields(): void {
    this.form.get('invoiceType')?.enable({ emitEvent: false });
    this.form.get('firmaAdi')?.enable({ emitEvent: false });
    this.form.get('vkn')?.enable({ emitEvent: false });
    this.form.get('vergiDairesi')?.enable({ emitEvent: false });
  }

  private applyInvoiceInfoFromCurrentUser(): void {
    const orgString = this.authService.currentUserValue?.organizations;
    let organizations: number[] = [];

    try {
      organizations = orgString ? JSON.parse(orgString) : [];
    } catch {
      organizations = [];
    }

    this.resetInvoiceLockedFields();

    if (!organizations || organizations.length === 0) {
      this.form.patchValue(
        {
          invoiceType: 1,
          firmaAdi: '',
          vkn: '',
          vergiDairesi: ''
        },
        { emitEvent: true }
      );

      this.form.get('invoiceType')?.disable({ emitEvent: false });
      return;
    }

    const firstOrganizationId = organizations[0];
    if (Number.isNaN(firstOrganizationId)) {
      return;
    }

    this.organizationManagementService.getById(firstOrganizationId).subscribe(result => {
      if (!result.isSuccess) {
        return;
      }

      this.form.patchValue(
        {
          invoiceType: 2,
          firmaAdi: result.data?.name ?? '',
          vkn: result.data?.taxNo ?? '',
          vergiDairesi: result.data?.taxOffice ?? ''
        },
        { emitEvent: true }
      );

      this.form.get('invoiceType')?.disable({ emitEvent: false });
      this.form.get('firmaAdi')?.disable({ emitEvent: false });
      this.form.get('vkn')?.disable({ emitEvent: false });
      this.form.get('vergiDairesi')?.disable({ emitEvent: false });
    });
  }

  openModal(userId: number, addressId?: number) {
    const keys = ['NEW_RECORD', 'EDIT'];
    const translations: any = {};

    const observables = keys.map(key => this.translate.get(key));

    forkJoin(observables).subscribe((results) => {
      keys.forEach((key, index) => {
        translations[key] = results[index];
      });

      this.modalTitle = addressId == null
        ? translations['NEW_RECORD']
        : translations['EDIT'];
    });

    this.form.get('invoiceType')?.enable({ emitEvent: false });
    this.form.get('firmaAdi')?.enable({ emitEvent: false });
    this.form.get('vkn')?.enable({ emitEvent: false });
    this.form.get('vergiDairesi')?.enable({ emitEvent: false });

    if (addressId) {
      this.userManagementService.getUserAddressById(addressId).subscribe(result => {
        if (result.isSuccess) {
          this.form.reset({
            id: 0,
            invoiceType: undefined,
            name: "",
            surname: "",
            phone: "",
            country: "",
            city: "",
            district: "",
            address: "",
            addressHeader: "",
            vkn: "",
            vergiDairesi: "",
            firmaAdi: "",
            userId: userId,
            isDeleted: false
          });

          this.form.patchValue(result.data);
          this.applyInvoiceInfoFromCurrentUser();
          this.isModalOpen = true;
        }
      });
    } else {
      this.form.reset({
        id: 0,
        invoiceType: undefined,
        name: "",
        surname: "",
        phone: "",
        country: "",
        city: "",
        district: "",
        address: "",
        addressHeader: "",
        vkn: "",
        vergiDairesi: "",
        firmaAdi: "",
        userId: userId,
        isDeleted: false
      });

      this.applyInvoiceInfoFromCurrentUser();
      this.isModalOpen = true;
    }
  }

  submit() {
    if (this.form.valid) {
      const data = this.form.getRawValue() as UserAddressModel;

      if (data.id == 0) {
        this.userManagementService.userAddressSave(data).subscribe(result => {
          if (result.isSuccess) {
            this.alertService.createAlert('success', this.translate.instant('MESSAGES.SUCCESS'));
            this.isSuccess.emit(true);
            this.closeModal();
          } else {
            this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
          }
        });
      } else {
        this.userManagementService.userAddressUpdate(data).subscribe(result => {
          if (result.isSuccess) {
            this.alertService.createAlert('success', this.translate.instant('MESSAGES.SUCCESS'));
            this.isSuccess.emit(true);
            this.closeModal();
          } else {
            this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
          }
        });
      }
    } else {
      this.form.markAllAsTouched();
    }
  }

  closeModal() {
    this.isModalOpen = false;
  }
}