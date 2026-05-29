import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaterialModule } from '../material/material-module';

@Component({
    selector: 'app-visit-edit',
    standalone: true,
    imports: [MaterialModule, ReactiveFormsModule, MatDialogModule],
    template: `
        <h2 mat-dialog-title>Edytuj wizytę</h2>
        <mat-dialog-content>
            <form [formGroup]="form" style="display: flex; flex-direction: column; gap: 15px; padding-top: 10px;">
                <mat-form-field appearance="outline">
                    <mat-label>Data i czas</mat-label>
                    <input matInput type="datetime-local" formControlName="visitDate">
                </mat-form-field>

                <mat-form-field appearance="outline">
                    <mat-label>Status</mat-label>
                    <mat-select formControlName="status">
                        <mat-option value="PLANNED">Zaplanowana</mat-option>
                        <mat-option value="COMPLETED">Zakończona</mat-option>
                        <mat-option value="CANCELLED">Anulowana</mat-option>
                    </mat-select>
                </mat-form-field>
                
                <mat-form-field appearance="outline">
                    <mat-label>Gabinet</mat-label>
                    <input matInput formControlName="room">
                </mat-form-field>
            </form>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
            <button mat-button (click)="dialogRef.close()">Anuluj</button>
            <button mat-raised-button color="primary" [disabled]="form.invalid" (click)="save()">Zapisz zmiany</button>
        </mat-dialog-actions>
    `
})
export class VisitEditDialog {
    private fb = inject(FormBuilder);
    dialogRef = inject(MatDialogRef<VisitEditDialog>);
    data = inject(MAT_DIALOG_DATA);

    form: FormGroup = this.fb.group({
        // Używamy visitDate i room, bo tak masz w głównej tabeli!
        visitDate: [this.formatDate(this.data.visitDate), Validators.required],
        status: [this.data.status || 'PLANNED', Validators.required],
        room: [this.data.room, Validators.required]
    });

    formatDate(dateString: string) {
        if (!dateString) return '';
        return new Date(dateString).toISOString().slice(0, 16); 
    }

    save() {
        this.dialogRef.close(this.form.value);
    }
}