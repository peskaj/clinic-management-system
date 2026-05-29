import { Component, OnInit, ViewChild, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../material/material-module';
import { PatientService, Patient } from './patient.service';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';

@Component({
    selector: 'app-patients',
    standalone: true,
    // Dodano MatPaginatorModule do importów
    imports: [CommonModule, MaterialModule, ReactiveFormsModule, MatPaginatorModule],
    templateUrl: './patients.html',
    styleUrls: ['./patients.css']
})
export class Patients implements OnInit, AfterViewInit {
    private patientService = inject(PatientService);
    private fb = inject(FormBuilder);
    
    dataSource = new MatTableDataSource<Patient>([]);
    displayedColumns: string[] = ['id', 'firstname', 'lastname', 'pesel', 'phone'];

    // Łapiemy paginator z pliku HTML
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

    // Spinamy paginator ze źródłem danych od razu po załadowaniu widoku
    ngAfterViewInit() {
        this.dataSource.paginator = this.paginator;
    }

    loadPatients() {
        this.patientService.getPatients().subscribe({
            next: (data) => {
                this.dataSource.data = data;
                // Agresywne zespawanie paginatora po przyjściu danych z serwera!
                if (this.paginator) {
                    this.dataSource.paginator = this.paginator;
                }
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

    onFileSelected(event: any) {
        const file: File = event.target.files[0];
        if (file) {
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
        }
        event.target.value = '';
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
}