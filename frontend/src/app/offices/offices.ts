import { Component, OnInit, ChangeDetectorRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../material/material-module';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';

import { OfficeService, Office } from './office.service';
import { DoctorService, Doctor } from '../doctors/doctor.service';
import { AuthService } from '../auth/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { OfficeEditDialog } from './office-edit';

@Component({
    selector: 'app-offices',
    standalone: true,
    imports: [CommonModule, MaterialModule, ReactiveFormsModule, MatPaginatorModule],
    templateUrl: './offices.html',
    styleUrls: ['./offices.css'] 
})
export class Offices implements OnInit {
    authService = inject(AuthService);
    private officeService = inject(OfficeService);
    private doctorService = inject(DoctorService);
    private fb = inject(FormBuilder);
    private cdr = inject(ChangeDetectorRef);

    dataSource = new MatTableDataSource<Office>([]);
    displayedColumns: string[] = ['id', 'name', 'type', 'assignedDoctor', 'actions'];

    doctors: Doctor[] = [];

    // ZMIANA: Bezpieczny setter paginatora, by uniknąć NG0100
    private paginator!: MatPaginator;
    @ViewChild(MatPaginator) set matPaginator(mp: MatPaginator) {
        if (mp) {
            this.paginator = mp;
            this.dataSource.paginator = this.paginator;
        }
    }

    officeForm = this.fb.group({
        name: ['', Validators.required],
        type: ['', Validators.required],
        doctorId: [null as number | null]
    });

    ngOnInit() {
        this.loadOffices();
        this.loadDoctors();
    }

    loadOffices() {
        this.officeService.getOffices().subscribe({
            next: (data) => {
                this.dataSource.data = data;
                this.cdr.detectChanges();
            },
            error: (err) => console.error('Błąd pobierania gabinetów:', err)
        });
    }

    loadDoctors() {
        this.doctorService.getDoctors().subscribe({
            next: (data) => this.doctors = data,
            error: (err) => console.error('Błąd pobierania słownika lekarzy:', err)
        });
    }

    onSubmit() {
        if (this.officeForm.valid) {
            const formVal = this.officeForm.value;
            
            const newOffice = {
                name: formVal.name as string,
                type: formVal.type as string,
                doctorId: formVal.doctorId ? (formVal.doctorId as number) : undefined
            };

            this.officeService.addOffice(newOffice).subscribe({
                next: () => {
                    this.loadOffices();
                    this.officeForm.reset();
                    Object.keys(this.officeForm.controls).forEach(key => {
                        this.officeForm.get(key)?.setErrors(null);
                    });
                },
                error: (err) => console.error('Błąd rejestracji gabinetu:', err)
            });
        }
    }

    deleteOffice(id: number) {
        this.officeService.deleteOffice(id).subscribe({
            next: () => this.loadOffices(),
            error: (err) => console.error('Błąd usuwania gabinetu:', err)
        });
    }
    private dialog = inject(MatDialog); // Wstrzykujemy generator dialogów

    // Metoda edycji dołączana do przycisku ołówka
    editOffice(office: any) {
        const dialogRef = this.dialog.open(OfficeEditDialog, {
            width: '400px',
            // Przekazujemy wybrany gabinet ORAZ całą pobraną listę lekarzy do dropdowna
            data: { office: office, doctors: this.doctors } 
        });

        dialogRef.afterClosed().subscribe(updatedData => {
            if (updatedData) {
                this.officeService.updateOffice(office.id, updatedData).subscribe({
                    next: () => this.loadOffices(), // Przeładowujemy po sukcesie
                    error: (err) => console.error('Błąd aktualizacji gabinetu', err)
                });
            }
        });
    }
}