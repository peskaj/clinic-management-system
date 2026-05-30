import { AuthService } from '../auth/auth.service';
import { Component, OnInit, ViewChild, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../material/material-module';
import { PatientService, Patient } from './patient.service';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { PatientEditDialog } from './patient-edit'; // Dopasuj ścieżkę
import { jsPDF } from 'jspdf'; 
// 1. FIX: Importujemy autoTable jako "efekt uboczny", co omija błędy z brakiem typów
import 'jspdf-autotable'; 
import { VisitService } from '../visits/visit.service';

@Component({
    selector: 'app-patients',
    standalone: true,
    imports: [CommonModule, MaterialModule, ReactiveFormsModule, MatPaginatorModule],
    templateUrl: './patients.html',
    styleUrls: ['./patients.css']
})
export class Patients implements OnInit, AfterViewInit {
    authService = inject(AuthService);
    private patientService = inject(PatientService);
    private visitService = inject(VisitService);
    private fb = inject(FormBuilder);
    private dialog = inject(MatDialog);
    
    dataSource = new MatTableDataSource<Patient>([]);
    displayedColumns: string[] = ['id', 'firstname', 'lastname', 'pesel', 'phone', 'actions'];

    @ViewChild('paginator') paginator!: MatPaginator;

    patientForm = this.fb.group({
        firstname: ['', Validators.required],
        lastname: ['', Validators.required],
        pesel: ['', [Validators.required, Validators.minLength(11), Validators.maxLength(11)]],
        phone: ['', Validators.required]
    });

    ngOnInit() {
        this.loadPatients();
    }

    ngAfterViewInit() {
        this.dataSource.paginator = this.paginator;
    }

    loadPatients() {
        this.patientService.getPatients().subscribe({
            next: (data) => {
                this.dataSource.data = data;
                if (this.paginator) {
                    this.dataSource.paginator = this.paginator;
                }
            },
            error: (err) => console.error('Błąd podczas pobierania pacjentów:', err)
        });
    }

    onSubmit() {
        if (this.patientForm.valid) {
            // 2. FIX: Wymuszamy typowanie string, żeby TypeScript nie panikował, że pole może być 'null'
            const formVal = this.patientForm.value;
            const newPatient = {
                firstname: formVal.firstname as string,
                lastname: formVal.lastname as string,
                pesel: formVal.pesel as string,
                phone: formVal.phone as string
            };

            this.patientService.addPatient(newPatient).subscribe({
                next: () => {
                    this.loadPatients();
                    this.patientForm.reset();
                },
                error: (err) => console.error('Błąd podczas dodawania pacjenta:', err)
            });
        }
    }

    // 3. FIX: Precyzyjne rzutowanie typu (Event -> HTMLInputElement), co ucisza błędy "target"
    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        
        // Zabezpieczenie przed anulowaniem wyboru pliku
        if (!input.files || input.files.length === 0) return;

        const file: File = input.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                let parsedData: any[] = [];

                if (file.name.toLowerCase().endsWith('.csv')) {
                    parsedData = this.parseCSV(content);
                } else {
                    parsedData = JSON.parse(content);
                }
                
                this.patientService.importPatients(parsedData).subscribe({
                    next: (res) => {
                        alert(`Pomyślnie zaimportowano ${res.importedCount} pacjentów!`);
                        this.loadPatients();
                    },
                    error: (err) => console.error('Błąd importu na serwerze:', err)
                });
            } catch (error) {
                alert('Błąd odczytu pliku! Upewnij się, że to poprawny format JSON lub CSV.');
            }
        };
        reader.readAsText(file);
        
        input.value = ''; // Reset inputa
    }

    private parseCSV(text: string): any[] {
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const obj: any = {};
            headers.forEach((header, index) => {
                if (values[index]) {
                    obj[header] = values[index];
                }
            });
            data.push(obj);
        }
        return data;
    }

    generatePdf(patient: Patient) {
        this.visitService.getPatientVisits(patient.id).subscribe({
            next: (visits) => {
                const doc = new jsPDF();
                
                doc.setFontSize(18);
                doc.text(`Historia medyczna: ${patient.firstname} ${patient.lastname}`, 14, 20);
                
                doc.setFontSize(12);
                doc.text(`PESEL: ${patient.pesel} | Telefon: ${patient.phone}`, 14, 30);
                
                if (visits.length === 0) {
                    doc.text('Brak zarejestrowanych wizyt dla tego pacjenta w systemie.', 14, 45);
                } else {
                    const tableData = visits.map((v: any, index: number) => [
                        index + 1,
                        (v.visitDate || '').replace('T', ' '), 
                        `${v.doctorFirstname} ${v.doctorLastname} \n(${v.specialization || 'Brak'})`,
                        v.room,
                        (v.status ? v.status.toUpperCase() : 'ZAPLANOWANA') 
                    ]);

                    // Zastosowanie (doc as any) wymusza wykonanie wtyczki omijając całkowicie inspekcję typów
                    (doc as any).autoTable({
                        startY: 40,
                        head: [['L.p.', 'Data i czas', 'Lekarz', 'Gabinet', 'Status']],
                        body: tableData,
                        theme: 'grid',
                        styles: { fontSize: 10 },
                        headStyles: { fillColor: [63, 81, 181] } 
                    });
                }
                
                doc.save(`Historia_Pacjenta_${patient.pesel}.pdf`);
            },
            error: (err) => console.error('Błąd pobierania historii wizyt do PDF:', err)
        });
    }  
    editPatient(patient: any) {
        const dialogRef = this.dialog.open(PatientEditDialog, {
            width: '400px',
            data: patient // Przekazujemy obecne dane pacjenta do okienka
        });

        dialogRef.afterClosed().subscribe(updatedData => {
            if (updatedData) {
                // Używamy patientService zamiast this.http
                this.patientService.updatePatient(patient.id, updatedData).subscribe({
                    next: () => {
                        this.loadPatients(); // Odświeżamy tabelę po edycji!
                        console.log('Pacjent zaktualizowany pomyślnie!');
                    },
                    error: (err) => console.error('Błąd aktualizacji', err)
                });
            }
        });
    }

    // Metoda usuwająca pacjenta
    deletePatient(id: number) {
        if (confirm('UWAGA! Usunięcie pacjenta wykasuje również całą jego historię wizyt z bazy. Czy na pewno chcesz kontynuować?')) {
            this.patientService.deletePatient(id).subscribe({
                next: () => {
                    this.loadPatients(); // Przeładowujemy tabelę po sukcesie
                },
                error: (err: any) => console.error('Błąd usuwania pacjenta:', err)
            });
        }
    }
}