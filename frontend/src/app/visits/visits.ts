import { AuthService } from '../auth/auth.service';
import { ChangeDetectorRef, Component, OnInit, AfterViewInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../material/material-module';
import { VisitService, Visit } from './visit.service';
import { PatientService, Patient } from '../patients/patient.service';
import { DoctorService, Doctor } from '../doctors/doctor.service';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';

// IMPORTY DO PAGINACJI I DIALOGÓW
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { VisitEditDialog } from './visit-edit'; 

@Component({
    selector: 'app-visits',
    standalone: true,
    imports: [CommonModule, MaterialModule, ReactiveFormsModule, MatPaginatorModule],
    templateUrl: './visits.html',
    styleUrls: ['./visits.css']
})
export class Visits implements OnInit, AfterViewInit {
    authService = inject(AuthService);
    private visitService = inject(VisitService);
    private patientService = inject(PatientService);
    private doctorService = inject(DoctorService);
    private fb = inject(FormBuilder);
    private dialog = inject(MatDialog);
    private cdr = inject(ChangeDetectorRef);

    dataSource = new MatTableDataSource<Visit>([]);
    
    private paginator!: MatPaginator;

    @ViewChild(MatPaginator) set matPaginator(mp: MatPaginator) {
        if (mp) {
            this.paginator = mp;
            this.dataSource.paginator = this.paginator;
        }
    }
    
    // Żelazna lista kolumn (musi idealnie pasować do HTML) - room zostaje w widoku!
    displayedColumns: string[] = ['id', 'patient', 'doctor', 'visitDate', 'room', 'status', 'actions'];

    patients: Patient[] = [];
    doctors: Doctor[] = [];

    // NOWE: Tablica na wolne terminy wyciągnięte z backendu
    availableSlots: string[] = [];
    
    // NOWE: Przechowuje nazwę automatycznie wczytanego gabinetu
    selectedRoomName: string = '';

    // ZMODYFIKOWANE: Wyrzucamy 'room', bo backend sam to przypisze
    visitForm = this.fb.group({
        patientId: [null as number | null, Validators.required],
        doctorId: [null as number | null, Validators.required],
        visitDate: ['', Validators.required]
    });

    ngOnInit() {
        this.loadVisits();
        this.loadDictionaries();
    }

    ngAfterViewInit() {
        this.dataSource.paginator = this.paginator;
    }

    loadVisits() {
        this.visitService.getVisits().subscribe({
            next: (data) => {
                // Po prostu przypisujemy dane, a podpięty wyżej setter sam zajmie się wyliczeniem stron
                this.dataSource.data = data; 
                this.cdr.detectChanges(); 
            },
            error: (err: any) => console.error('Błąd pobierania wizyt:', err)
        });
    }

    loadDictionaries() {
        this.patientService.getPatients().subscribe(data => this.patients = data);
        this.doctorService.getDoctors().subscribe(data => this.doctors = data);
    }

    // NOWE: Metoda odpalana po wybraniu lekarza z listy rozwijanej
    onDoctorSelected(doctorId: any) {
        const id = Number(doctorId);
        if (id) {
            // Czyścimy wcześniej wybraną datę, by zapobiec błędom
            this.visitForm.get('visitDate')?.setValue(null); 
            
            // NOWE: Automatyczne znalezienie gabinetu w profilu lekarza
            const doctor = this.doctors.find(d => d.id === id);
            // Ponieważ użyliśmy 'any', kompilator nie będzie krzyczał o brakujące pole roomName z LEFT JOIN
            this.selectedRoomName = (doctor as any)?.roomName || 'Brak przypisanego gabinetu';

            // Pobieramy świeże okienka z backendu
            this.visitService.getAvailableSlots(id).subscribe({
                next: (slots) => {
                    this.availableSlots = slots;
                    this.cdr.detectChanges(); // Wymuszamy aktualizację widoku
                },
                error: (err) => console.error('Błąd pobierania terminów:', err)
            });
        } else {
            this.availableSlots = [];
            this.selectedRoomName = ''; // Czyścimy nazwę, gdy odznaczono lekarza
        }
    }

    onSubmit() {
        if (this.visitForm.valid) {
            const formVal = this.visitForm.value;
            
            // ZMODYFIKOWANE: Paczka danych wysyłana na backend (bez pokoju)
            const newVisit = {
                patientId: formVal.patientId as number,
                doctorId: formVal.doctorId as number,
                visitDate: formVal.visitDate as string
            };

            this.visitService.addVisit(newVisit).subscribe({
                next: () => {
                    this.loadVisits();
                    this.visitForm.reset();
                    this.availableSlots = []; // Chowamy kafelki po sukcesie
                    
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
                        this.loadVisits(); 
                        console.log('Wizyta zaktualizowana!');
                    },
                    error: (err) => console.error('Błąd aktualizacji wizyty', err)
                });
            }
        });
    }
}