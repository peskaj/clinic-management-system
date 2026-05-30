import { AuthService } from '../auth/auth.service';
import { Component, OnInit, ChangeDetectorRef, AfterViewInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../material/material-module';
import { DoctorService, Doctor } from './doctor.service';
import { VisitService } from '../visits/visit.service';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';

import { CalendarModule, CalendarEvent, CalendarView } from 'angular-calendar';
import { Subject } from 'rxjs'; 

// IMPORTY PAGINACJI
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';

@Component({
    selector: 'app-doctors',
    standalone: true,
    imports: [CommonModule, MaterialModule, ReactiveFormsModule, CalendarModule, MatPaginatorModule],
    templateUrl: './doctors.html',
    styleUrls: ['./doctors.css']
})
export class Doctors implements OnInit, AfterViewInit {
    authService = inject(AuthService);
    private doctorService = inject(DoctorService);
    private visitService = inject(VisitService);
    private fb = inject(FormBuilder);
    private cdr = inject(ChangeDetectorRef);
    
    dataSource = new MatTableDataSource<Doctor>([]);
    displayedColumns: string[] = ['id', 'firstname', 'lastname', 'specialization', 'actions'];

    // ŁAPIEMY PAGINATOR
    @ViewChild(MatPaginator) paginator!: MatPaginator;

    viewDate: Date = new Date();
    view: CalendarView = CalendarView.Week;
    CalendarView = CalendarView;
    events: CalendarEvent[] = [];
    selectedDoctor: Doctor | null = null;
    
    refresh = new Subject<void>();

    doctorForm = this.fb.group({
        firstname: ['', Validators.required],
        lastname: ['', Validators.required],
        specialization: ['', Validators.required]
    });

    ngOnInit() {
        this.loadDoctors();
    }

    // SPINAMY PAGINATOR Z TABELĄ
    ngAfterViewInit() {
        this.dataSource.paginator = this.paginator;
    }

    loadDoctors() {
        this.doctorService.getDoctors().subscribe({
            next: (data) => {
                this.dataSource.data = [...data];
                if (this.paginator) {
                    this.dataSource.paginator = this.paginator;
                }
                this.cdr.detectChanges();
            },
            error: (err) => console.error('Błąd pobierania lekarzy:', err)
        });
    }

    onSubmit() {
        if (this.doctorForm.valid) {
            const newDoctor = {
                firstname: this.doctorForm.value.firstname as string,
                lastname: this.doctorForm.value.lastname as string,
                specialization: this.doctorForm.value.specialization as string
            };

            this.doctorService.addDoctor(newDoctor).subscribe({
                next: () => {
                    this.loadDoctors();
                    this.doctorForm.reset();
                    // Resetowanie błędów formularza po dodaniu
                    Object.keys(this.doctorForm.controls).forEach(key => {
                        this.doctorForm.get(key)?.setErrors(null);
                    });
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
        // Poprawka dla nowych statusów DB!
        if (status === 'odbyta' || status === 'COMPLETED') return { primary: '#4caf50', secondary: '#c8e6c9' };
        if (status === 'anulowana' || status === 'CANCELLED') return { primary: '#f44336', secondary: '#ffcdd2' };
        return { primary: '#2196f3', secondary: '#bbdefb' }; // Wcześniej 'PLANNED'
    }
}