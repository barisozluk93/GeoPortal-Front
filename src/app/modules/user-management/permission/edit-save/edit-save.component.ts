import { Component, EventEmitter, OnInit, Output, ViewChild } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { ModalComponent, ModalConfig } from "src/app/_metronic/partials";
import { PermissionModel } from "../../models/permission.model";
import { UserManagementService } from "../../user-management.service";
import { AlertService } from "src/app/_metronic/partials/layout/alert/alert.service";
import { forkJoin } from "rxjs";
import { TranslateService } from "@ngx-translate/core";

@Component({
    selector: 'app-permission-editsave',
    templateUrl: './edit-save.component.html',
    styleUrls: ['./edit-save.component.scss'],
})
export class PermissionEditSaveComponent implements OnInit {
    isModalOpen: boolean = false;
    @Output() isSuccess: EventEmitter<boolean> = new EventEmitter<boolean>();

    modalTitle: string;
    form: FormGroup;

    constructor(
        private fb: FormBuilder,
        private userManagementService: UserManagementService,
        private alertService: AlertService,
        private translate: TranslateService
    ) { }

    disableSubmitButton(): boolean {
        return this.form.valid;
    }

    get f() {
        return this.form.controls;
    }

    isInvalid(controlName: string): boolean {
        const control = this.form.get(controlName);
        return !!(control && control.invalid && (control.dirty || control.touched));
    }

    initForm() {
        this.form = this.fb.group({
            id: 0,
            name: [
                "",
                Validators.compose([
                    Validators.required,
                ]),
            ],
            code: [
                "",
                Validators.compose([
                    Validators.required,
                ]),
            ],
            isDeleted: false,
            isSystemData: false
        });
    }

    ngOnInit(): void {
        this.initForm();
    }

    openModal(permissionId?: number) {

        const keys = ['NEW_RECORD', 'EDIT', 'SUBMIT', 'CANCEL'];

        const translations: any = {};

        const observables = keys.map(key => this.translate.get(key));

        forkJoin(observables).subscribe((results) => {
            keys.forEach((key, index) => {
                translations[key] = results[index]
            })
        })

        this.modalTitle = permissionId == null ? translations['NEW_RECORD'] : translations['EDIT'];

        if (permissionId) {
            this.userManagementService.getPermissionById(permissionId).subscribe(result => {
                if (result.isSuccess) {
                    this.form.patchValue(result.data);
                    this.isModalOpen = true;
                }
            })
        }
        else {
            this.form.reset({ id: 0, name: "", code: "", isDeleted: false, isSystemData: false });
            this.isModalOpen = true;
        }
    }

    submit() {
        if (this.form.valid) {
            var data = this.form.getRawValue() as PermissionModel;

            if (data.id == 0) {
                this.userManagementService.permissionSave(data).subscribe(result => {
                    if (result.isSuccess) {
                        this.closeModal();
                        this.alertService.createAlert('success', this.translate.instant('MESSAGES.SUCCESS'));
                        this.isSuccess.emit(true);
                    }
                    else {
                        this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
                    }
                })
            }
            else {
                this.userManagementService.permissionEdit(data).subscribe(result => {
                    if (result.isSuccess) {
                        this.closeModal();
                        this.alertService.createAlert('success', this.translate.instant('MESSAGES.SUCCESS'));
                        this.isSuccess.emit(true);
                    }
                    else {
                        this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
                    }
                })
            }
        }
    }

    closeModal() {
        this.isModalOpen = false;
    }
}