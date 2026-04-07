import { Component, EventEmitter, OnInit, Output, ViewChild } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { ModalComponent, ModalConfig } from "src/app/_metronic/partials";
import { OrganizationManagementService } from "../organization-management.service";
import { OrganizationModel } from "../models/organization.model";
import { AlertService } from "src/app/_metronic/partials/layout/alert/alert.service";
import { TranslateService } from "@ngx-translate/core";
import { forkJoin } from "rxjs";

@Component({
    selector: 'app-organization-editsave',
    templateUrl: './edit-save.component.html',
    styleUrls: ['./edit-save.component.scss'],
})
export class OrganizationEditSaveComponent implements OnInit {

    isModalOpen: boolean = false;
    @Output() isSuccess: EventEmitter<boolean> = new EventEmitter<boolean>();

    modalTitle: string;
    form: FormGroup;

    constructor(
        private fb: FormBuilder,
        private organizationManagementService: OrganizationManagementService,
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
            id: 0,
            name: [
                "",
                Validators.compose([
                    Validators.required,
                ]),
            ],
            taxNo: [
                null,
                Validators.compose([
                    Validators.required,
                ]),
            ],
            taxOffice: [
                null,
                Validators.compose([
                    Validators.required,
                ]),
            ],
            phone: [
                null,
                Validators.compose([
                    Validators.pattern(/^\(\d{3}\)\s\d{3}\s\d{2}\s\d{2}$/),
                ]),
            ],
            email: [
                null,
                Validators.compose([
                    Validators.email
                ]),
            ],
            isDeleted: false,
            isSystemData: false,
        });
    }

    ngOnInit(): void {
        this.initForm();
    }

    openModal(organizationId?: number) {

        const keys = ['NEW_RECORD', 'EDIT', 'SUBMIT', 'CANCEL'];

        const translations: any = {};

        const observables = keys.map(key => this.translate.get(key));

        forkJoin(observables).subscribe((results) => {
            keys.forEach((key, index) => {
                translations[key] = results[index]
            })
        })

        this.modalTitle = organizationId == null ? translations['NEW_RECORD'] : translations['EDIT'];

        if (organizationId) {
            this.organizationManagementService.getById(organizationId).subscribe(result => {
                if (result.isSuccess) {
                    this.form.patchValue(result.data);
                    this.isModalOpen = true;
                }
            })
        }
        else {
            this.form.reset({ id: 0, name: "", taxNo: "", taxOffice: "", phone: "", email: "", isDeleted: false, isSystemData: false });
            this.isModalOpen = true;
        }
    }

    submit() {
        if (this.form.valid) {
            var data = this.form.getRawValue() as OrganizationModel;

            if (data.id == 0) {
                this.organizationManagementService.save(data).subscribe(result => {
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
                this.organizationManagementService.edit(data).subscribe(result => {
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