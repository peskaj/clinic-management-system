import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../material/material-module';
import { PatientService, Patient } from './patient.service';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';

@Component({
    selector: 'app-patients',
    standalone: true,
    imports: [CommonModule, MaterialModule, ReactiveFormsModule],
    templateUrl: './patients.html',
    styleUrls: ['./patients.css']
})
export class Patients implements OnInit {
    private patientService = inject(PatientService);
    private fb = inject(FormBuilder);
    
    // Używamy pancernego MatTableDataSource zamiast sygnałów i zwykłych tablic
    dataSource = new MatTableDataSource<Patient>([]);
    displayedColumns: string[] = ['id', 'firstname', 'lastname', 'pesel', 'phone'];

    patientForm = this.fb.group({
        firstname: ['', Validators.required],
        lastname: ['', Validators.required],
        pesel: ['', [Validators.required, Validators.minLength(11), Validators.maxLength(11)]],
        phone: ['', Validators.required]
    });

    ngOnInit() {
        this.loadPatients();
    }

    loadPatients() {
        this.patientService.getPatients().subscribe({
            next: (data) => {
                // To przypisanie gwarantuje natychmiastowe odświeżenie tabeli!
                this.dataSource.data = data; 
            },
            error: (err) => console.error('Błąd podczas pobierania pacjentów:', err)
        });
    }

    onSubmit() {
        if (this.patientForm.valid) {
            this.patientService.addPatient(this.patientForm.value as Omit<Patient, 'id'>).subscribe({
                next: () => {
                    this.loadPatients();
                    this.patientForm.reset();
                },
                error: (err) => console.error('Błąd podczas dodawania pacjenta:', err)
            });
        }
    }
}