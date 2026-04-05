import { Component, EventEmitter, OnInit, Output } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { TranslateService } from "@ngx-translate/core";
import { forkJoin } from "rxjs";
import { AlertService } from "src/app/_metronic/partials/layout/alert/alert.service";
import { RoleModel } from "../../models/role.model";
import { UserModel } from "../../models/user.model";
import { UserManagementService } from "../../user-management.service";
import { ConfirmPasswordValidator } from "./confirm-password.validator";

@Component({
  selector: "app-user-editsave",
  templateUrl: "./edit-save.component.html",
  styleUrls: ["./edit-save.component.scss"],
})
export class UserEditSaveComponent implements OnInit {
  isModalOpen = false;
  modalTitle: string;

  @Output() isSuccess = new EventEmitter<boolean>();

  form: FormGroup;
  roleList: RoleModel[] = [];

  constructor(
    private fb: FormBuilder,
    private userManagementService: UserManagementService,
    private alertService: AlertService,
    private translate: TranslateService
  ) { }

  get f() {
    return this.form.controls;
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.form = this.fb.group(
      {
        id: [0],
        name: ["", Validators.required],
        surname: ["", Validators.required],
        email: ["", [Validators.required, Validators.email]],
        phone: [
          "",
          [
            Validators.required,
            Validators.pattern(/^\(\d{3}\)\s\d{3}\s\d{2}\s\d{2}$/)
          ]
        ],
        username: ["", Validators.required],
        password: ["", Validators.required],
        cPassword: ["", Validators.required],
        roles: [null, Validators.required],
        isDeleted: false,
        isSystemData: false
      },
      {
        validator: ConfirmPasswordValidator.MatchPassword
      }
    );
  }

  openModal(userId?: number): void {
    forkJoin([
      this.userManagementService.allRoles(),
      this.translate.get(["NEW_RECORD", "EDIT"])
    ]).subscribe(([rolesResult, translations]) => {
      if (rolesResult.isSuccess) {
        this.roleList = rolesResult.data;
      }

      this.modalTitle = userId ? translations["EDIT"] : translations["NEW_RECORD"];

      if (userId) {
        this.userManagementService.getUserById(userId).subscribe(result => {
          if (result.isSuccess) {
            this.form.patchValue(result.data);

            this.form.patchValue({
              password: "•••",
              cPassword: "•••",
              roles: result.data.roles?.[0] ?? null
            });

            this.isModalOpen = true;
          }
        });
      } else {
        this.form.reset({
          id: 0,
          name: "",
          surname: "",
          email: "",
          password: "",
          cPassword: "",
          username: "",
          phone: "",
          roles: null,
          isDeleted: false,
          isSystemData: false
        });

        this.isModalOpen = true;
      }
    });
  }

  submit(): void {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      return;
    }

    const temp = this.form.getRawValue();

    const data: UserModel = {
      ...temp,
      roles: temp.roles ? [temp.roles] : []
    };

    const request =
      data.id === 0
        ? this.userManagementService.userSave(data)
        : this.userManagementService.userEdit(data);

    request.subscribe(result => {
      if (result.isSuccess) {
        this.closeModal();
        this.alertService.createAlert('success', this.translate.instant('MESSAGES.SUCCESS'));
        this.isSuccess.emit(true);
      } else {
        this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
      }
    });
  }

  closeModal(): void {
    this.isModalOpen = false;
  }
}