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
        console.log('RADAR: Odpalam funkcję pobierania...'); // <--- DODAJ TO
        this.visitService.getVisits().subscribe({
            next: (data) => {
                this.dataSource.data = data;
                console.log('RADAR: Przyszły dane z backendu!', data); // <--- DODAJ TO
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
}