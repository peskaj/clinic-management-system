import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../material/material-module';
import { VisitService, Visit } from './visit.service';
import { PatientService, Patient } from '../patients/patient.service';
import { DoctorService, Doctor } from '../doctors/doctor.service';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';

@Component({
    selector: 'app-visits',
    standalone: true,
    imports: [CommonModule, MaterialModule, ReactiveFormsModule],
    templateUrl: './visits.html',
    styleUrls: ['./visits.css']
})
export class Visits implements OnInit {
    private visitService = inject(VisitService);
    private patientService = inject(PatientService);
    private doctorService = inject(DoctorService);
    private fb = inject(FormBuilder);
    
    dataSource = new MatTableDataSource<Visit>([]);
    // Dodaliśmy kolumnę 'actions' na przycisk usuwania
    displayedColumns: string[] = ['id', 'patient', 'doctor', 'visitDate', 'room', 'actions'];

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
            next: (data) => this.dataSource.data = data,
            error: (err) => console.error('Błąd pobierania wizyt:', err)
        });
    }

    // Pobieramy dane do list rozwijanych (Selectów)
    loadDictionaries() {
        this.patientService.getPatients().subscribe(data => this.patients = data);
        this.doctorService.getDoctors().subscribe(data => this.doctors = data);
    }

    onSubmit() {
        if (this.visitForm.valid) {
            this.visitService.addVisit(this.visitForm.value as any).subscribe({
                next: () => {
                    this.loadVisits();
                    this.visitForm.reset();
                },
                error: (err) => console.error('Błąd rejestracji wizyty:', err)
            });
        }
    }

    deleteVisit(id: number) {
        this.visitService.deleteVisit(id).subscribe({
            next: () => this.loadVisits(),
            error: (err) => console.error('Błąd odwoływania wizyty:', err)
        });
    }
}