import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaterialModule } from '../material/material-module';

@Component({
    selector: 'app-patient-edit',
    standalone: true,
    imports: [MaterialModule, ReactiveFormsModule, MatDialogModule],
    template: `
        <h2 mat-dialog-title>Edytuj dane pacjenta</h2>
        <mat-dialog-content>
            <form [formGroup]="form" style="display: flex; flex-direction: column; gap: 15px; padding-top: 10px;">
                <mat-form-field>
                    <mat-label>Imię</mat-label>
                    <input matInput formControlName="firstname">
                </mat-form-field>
                <mat-form-field>
                    <mat-label>Nazwisko</mat-label>
                    <input matInput formControlName="lastname">
                </mat-form-field>
                <mat-form-field>
                    <mat-label>Telefon</mat-label>
                    <input matInput formControlName="phone">
                </mat-form-field>
                <mat-form-field>
                    <mat-label>PESEL</mat-label>
                    <input matInput formControlName="pesel">
                </mat-form-field>
            </form>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
            <button mat-button (click)="dialogRef.close()">Anuluj</button>
            <button mat-raised-button color="primary" [disabled]="form.invalid" (click)="save()">Zapisz zmiany</button>
        </mat-dialog-actions>
    `
})
export class PatientEditDialog {
    private fb = inject(FormBuilder);
    dialogRef = inject(MatDialogRef<PatientEditDialog>);
    data = inject(MAT_DIALOG_DATA);

    form: FormGroup = this.fb.group({
        firstname: [this.data.firstname, Validators.required],
        lastname: [this.data.lastname, Validators.required],
        phone: [this.data.phone],
        pesel: [this.data.pesel]
    });

    save() {
        this.dialogRef.close(this.form.value);
    }
}