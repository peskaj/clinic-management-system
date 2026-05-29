// frontend/src/app/patients/patients.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../material/material-module';
import { PatientService, Patient } from './patient.service';

@Component({
    selector: 'app-patients',
    standalone: true,
    imports: [CommonModule, MaterialModule],
    templateUrl: './patients.html',
    styleUrls: ['./patients.css']
})
export class Patients implements OnInit {
    private patientService = inject(PatientService);
    
    patients: Patient[] = [];
    displayedColumns: string[] = ['id', 'firstname', 'lastname', 'pesel', 'phone'];

    ngOnInit() {
        this.loadPatients();
    }

    loadPatients() {
        this.patientService.getPatients().subscribe({
            next: (data) => {
                this.patients = data;
            },
            error: (err) => {
                console.error('Błąd podczas pobierania pacjentów:', err);
            }
        });
    }
}