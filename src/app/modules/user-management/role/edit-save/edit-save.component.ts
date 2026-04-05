import { Component, EventEmitter, OnInit, Output } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { UserManagementService } from "../../user-management.service";
import { RoleModel } from "../../models/role.model";
import { PermissionModel } from "../../models/permission.model";
import { AlertService } from "src/app/_metronic/partials/layout/alert/alert.service";
import { forkJoin } from "rxjs";
import { TranslateService } from "@ngx-translate/core";

@Component({
  selector: 'app-role-editsave',
  templateUrl: './edit-save.component.html',
  styleUrls: ['./edit-save.component.scss'],
})
export class RoleEditSaveComponent implements OnInit {
  isModalOpen: boolean = false;
  @Output() isSuccess: EventEmitter<boolean> = new EventEmitter<boolean>();

  modalTitle: string;
  form: FormGroup;
  permissionList: PermissionModel[] = [];

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

  initForm() {
    this.form = this.fb.group({
      id: [0],
      name: [
        "",
        Validators.compose([
          Validators.required,
        ]),
      ],
      permissions: [
        null,
        Validators.compose([
          Validators.required,
        ]),
      ],
      isDeleted: [false],
      isSystemData: [false]
    });
  }

  ngOnInit(): void {
    this.initForm();
  }

  openModal(roleId?: number) {
    const keys = ['NEW_RECORD', 'EDIT', 'SUBMIT', 'CANCEL'];
    const translations: any = {};
    const observables = keys.map(key => this.translate.get(key));

    forkJoin([
      this.userManagementService.allPermissions(),
      forkJoin(observables)
    ]).subscribe(([permissionResult, translationResults]) => {
      if (permissionResult.isSuccess) {
        this.permissionList = permissionResult.data;
      }

      keys.forEach((key, index) => {
        translations[key] = translationResults[index];
      });

      this.modalTitle = roleId == null ? translations['NEW_RECORD'] : translations['EDIT'];

      if (roleId) {
        this.userManagementService.getRoleById(roleId).subscribe(result => {
          if (result.isSuccess) {
            this.form.patchValue({
              id: result.data.id,
              name: result.data.name,
              permissions: result.data.permissions,
              isDeleted: result.data.isDeleted,
              isSystemData: result.data.isSystemData
            });

            this.isModalOpen = true;
          }
        });
      } else {
        this.form.reset({
          id: 0,
          name: "",
          permissions: null,
          isDeleted: false,
          isSystemData: false
        });

        this.isModalOpen = true;
      }
    });
  }

  submit() {
    if (this.form.valid) {
      const data = this.form.getRawValue() as RoleModel;

      if (data.id == 0) {
        this.userManagementService.roleSave(data).subscribe(result => {
          if (result.isSuccess) {
            this.closeModal();
            this.alertService.createAlert('success', this.translate.instant('MESSAGES.SUCCESS'));
            this.isSuccess.emit(true);
          } else {
            this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
          }
        });
      } else {
        this.userManagementService.roleEdit(data).subscribe(result => {
          if (result.isSuccess) {
            this.closeModal();
            this.alertService.createAlert('success', this.translate.instant('MESSAGES.SUCCESS'));
            this.isSuccess.emit(true);
          } else {
            this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
          }
        });
      }
    }
  }

  closeModal() {
    this.isModalOpen = false;
  }
}