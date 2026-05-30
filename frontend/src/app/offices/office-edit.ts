import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../material/material-module';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
// 1. ZMIANA: Dopisz MatDialogModule do tego importu
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { Doctor } from '../doctors/doctor.service';

@Component({
    selector: 'app-office-edit',
    standalone: true,
    // 2. ZMIANA: Wrzuć MatDialogModule do tablicy imports
    imports: [CommonModule, MaterialModule, ReactiveFormsModule, MatDialogModule],
    template: `
        <h2 mat-dialog-title>Edytuj Gabinet</h2>
        <mat-dialog-content>
            <form [formGroup]="editForm" style="display: flex; flex-direction: column; gap: 15px; margin-top: 10px;">
                <mat-form-field appearance="outline">
                    <mat-label>Nazwa / Numer</mat-label>
                    <input matInput formControlName="name">
                </mat-form-field>

                <mat-form-field appearance="outline">
                    <mat-label>Typ Gabinetu</mat-label>
                    <mat-select formControlName="type">
                        <mat-option value="Konsultacyjny">Konsultacyjny</mat-option>
                        <mat-option value="Zabiegowy">Zabiegowy</mat-option>
                        <mat-option value="Diagnostyczny">Diagnostyczny (USG/RTG)</mat-option>
                    </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline">
                    <mat-label>Przypisany Lekarz</mat-label>
                    <mat-select formControlName="doctorId">
                        <mat-option [value]="null">-- Brak (wolny gabinet) --</mat-option>
                        @for (doctor of data.doctors; track $index) {
                            <mat-option [value]="doctor.id">
                                {{ doctor.firstname }} {{ doctor.lastname }} ({{ doctor.specialization }})
                            </mat-option>
                        }
                    </mat-select>
                </mat-form-field>
            </form>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
            <button mat-button (click)="dialogRef.close()">Anuluj</button>
            <button mat-flat-button color="primary" [disabled]="editForm.invalid" (click)="onSave()">Zapisz</button>
        </mat-dialog-actions>
    `
})
export class OfficeEditDialog {
    dialogRef = inject(MatDialogRef<OfficeEditDialog>);
    data: { office: any, doctors: Doctor[] } = inject(MAT_DIALOG_DATA);
    private fb = inject(FormBuilder);

    editForm = this.fb.group({
        name: [this.data.office.name, Validators.required],
        type: [this.data.office.type, Validators.required],
        doctorId: [this.data.office.doctorId || null]
    });

    onSave() {
        if (this.editForm.valid) {
            const formVal = this.editForm.value;
            this.dialogRef.close({
                name: formVal.name,
                type: formVal.type,
                doctorId: formVal.doctorId ? Number(formVal.doctorId) : null
            });
        }
    }
}