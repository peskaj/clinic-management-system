import { AuthService } from '../auth/auth.service';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../material/material-module';
import { DoctorService, Doctor } from './doctor.service';
import { VisitService } from '../visits/visit.service';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';

import { CalendarModule, CalendarEvent, CalendarView } from 'angular-calendar';
import { Subject } from 'rxjs'; 

@Component({
    selector: 'app-doctors',
    standalone: true,
    imports: [CommonModule, MaterialModule, ReactiveFormsModule, CalendarModule],
    templateUrl: './doctors.html',
    styleUrls: ['./doctors.css']
})
export class Doctors implements OnInit {
    authService = inject(AuthService);
    private doctorService = inject(DoctorService);
    private visitService = inject(VisitService);
    private fb = inject(FormBuilder);
    
    dataSource = new MatTableDataSource<Doctor>([]);
    displayedColumns: string[] = ['id', 'firstname', 'lastname', 'specialization', 'actions'];

    viewDate: Date = new Date();
    view: CalendarView = CalendarView.Week;
    CalendarView = CalendarView;
    events: CalendarEvent[] = [];
    selectedDoctor: Doctor | null = null;
    
    refresh = new Subject<void>();

    // PRZYWRÓCONY FORMULARZ!
    doctorForm = this.fb.group({
        firstname: ['', Validators.required],
        lastname: ['', Validators.required],
        specialization: ['', Validators.required]
    });

    ngOnInit() {
        this.loadDoctors();
    }

    loadDoctors() {
        this.doctorService.getDoctors().subscribe({
            next: (data) => this.dataSource.data = data,
            error: (err) => console.error('Błąd pobierania lekarzy:', err)
        });
    }

    onSubmit() {
        if (this.doctorForm.valid) {
            // Zabezpieczenie typów dla rygorystycznego kompilatora
            const newDoctor = {
                firstname: this.doctorForm.value.firstname as string,
                lastname: this.doctorForm.value.lastname as string,
                specialization: this.doctorForm.value.specialization as string
            };

            this.doctorService.addDoctor(newDoctor).subscribe({
                next: () => {
                    this.loadDoctors();
                    this.doctorForm.reset();
                },
                error: (err) => console.error('Błąd rejestracji lekarza:', err)
            });
        }
    }

    deleteDoctor(id: number) {
        this.doctorService.deleteDoctor(id).subscribe({
            next: () => {
                this.loadDoctors();
                if (this.selectedDoctor?.id === id) this.selectedDoctor = null;
            },
            error: (err: any) => console.error('Błąd usuwania lekarza:', err)
        });
    }

    showCalendar(doctor: Doctor) {
        this.selectedDoctor = doctor;
        this.visitService.getDoctorVisits(doctor.id).subscribe({
            next: (visits: any[]) => {
                console.log(`Pobrano wizyt dla ${doctor.lastname}:`, visits);
                
                this.events = visits.map(v => ({
                    start: new Date(v.visitDate), 
                    title: `Pacjent: ${v.patientFirstname} ${v.patientLastname} | Gabinet: ${v.room} | Status: ${v.status}`,
                    color: this.getEventColor(v.status)
                }));
                
                this.refresh.next(); 
            },
            error: (err: any) => console.error('Błąd pobierania wizyt do kalendarza:', err)
        });
    }

    getEventColor(status: string) {
        if (status === 'odbyta') return { primary: '#4caf50', secondary: '#c8e6c9' };
        if (status === 'anulowana') return { primary: '#f44336', secondary: '#ffcdd2' };
        return { primary: '#2196f3', secondary: '#bbdefb' };
    }
}