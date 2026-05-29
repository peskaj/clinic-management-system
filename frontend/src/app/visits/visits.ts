import { AuthService } from '../auth/auth.service';
import { ChangeDetectorRef } from '@angular/core';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../material/material-module';
import { VisitService, Visit } from './visit.service';
import { PatientService, Patient } from '../patients/patient.service';
import { DoctorService, Doctor } from '../doctors/doctor.service';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';

// BRAKUJĄCE IMPORTY DO DIALOGU:
import { MatDialog } from '@angular/material/dialog';
import { VisitEditDialog } from './visit-edit'; // Upewnij się, że plik visit-edit.ts jest w tym samym folderze

@Component({
    selector: 'app-visits',
    standalone: true,
    imports: [CommonModule, MaterialModule, ReactiveFormsModule],
    templateUrl: './visits.html',
    styleUrls: ['./visits.css']
})
export class Visits implements OnInit {
    authService = inject(AuthService);
    private visitService = inject(VisitService);
    private patientService = inject(PatientService);
    private doctorService = inject(DoctorService);
    private fb = inject(FormBuilder);
    private dialog = inject(MatDialog);
    private cdr = inject(ChangeDetectorRef);

    dataSource = new MatTableDataSource<Visit>([]);
    
    // Żelazna lista kolumn (musi idealnie pasować do HTML)
    displayedColumns: string[] = ['id', 'patient', 'doctor', 'visitDate', 'room', 'status', 'actions'];

    patients: Patient[] = [];
    doctors: Doctor[] = [];

    visitForm = this.fb.group({
        patientId: [null as number | null, Validators.required],
        doctorId: [null as number | null, Validators.required],
        visitDate: ['', Validators.required],
        room: ['', Validators.required]
    });

    ngOnInit() {
        this.loadVisits();
        this.loadDictionaries();
    }

    loadVisits() {
     this.visitService.getVisits().subscribe({
         next: (data) => {
             // Używamy [...data], żeby stworzyć fizycznie nową tablicę w pamięci
             this.dataSource.data = [...data]; 

             // Wymuszamy na Angularze natychmiastowe odświeżenie HTML-a!
             this.cdr.detectChanges(); 
         },
         error: (err: any) => console.error('Błąd pobierania wizyt:', err)
     });
 }

    loadDictionaries() {
        this.patientService.getPatients().subscribe(data => this.patients = data);
        this.doctorService.getDoctors().subscribe(data => this.doctors = data);
    }

    onSubmit() {
        if (this.visitForm.valid) {
            const formVal = this.visitForm.value;
            const newVisit = {
                patientId: formVal.patientId as number,
                doctorId: formVal.doctorId as number,
                visitDate: formVal.visitDate as string,
                room: formVal.room as string
            };

            this.visitService.addVisit(newVisit).subscribe({
                next: () => {
                    this.loadVisits();
                    this.visitForm.reset();
                    // Resetowanie wizualnych błędów po dodaniu
                    Object.keys(this.visitForm.controls).forEach(key => {
                        this.visitForm.get(key)?.setErrors(null);
                    });
                },
                error: (err: any) => console.error('Błąd rejestracji wizyty:', err)
            });
        }
    }

    changeStatus(id: number, newStatus: string) {
        this.visitService.updateStatus(id, newStatus).subscribe({
            next: () => this.loadVisits(),
            error: (err: any) => console.error('Błąd zmiany statusu:', err)
        });
    }

    deleteVisit(id: number) {
        this.visitService.deleteVisit(id).subscribe({
            next: () => this.loadVisits(),
            error: (err: any) => console.error('Błąd odwoływania wizyty:', err)
        });
    }

    editVisit(visit: any) {
        const dialogRef = this.dialog.open(VisitEditDialog, {
            width: '400px',
            data: visit
        });

        dialogRef.afterClosed().subscribe(updatedData => {
            if (updatedData) {
                this.visitService.updateVisit(visit.id, updatedData).subscribe({
                    next: () => {
                        this.loadVisits(); // Metoda przeładowująca tabelę wizyt
                        console.log('Wizyta zaktualizowana!');
                    },
                    error: (err) => console.error('Błąd aktualizacji wizyty', err)
                });
            }
        });
    }
}