import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../material/material-module';
import { DoctorService, Doctor } from './doctor.service';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';

@Component({
    selector: 'app-doctors',
    standalone: true,
    imports: [CommonModule, MaterialModule, ReactiveFormsModule],
    templateUrl: './doctors.html',
    styleUrls: ['./doctors.css']
})
export class Doctors implements OnInit {
    private doctorService = inject(DoctorService);
    private fb = inject(FormBuilder);
    
    dataSource = new MatTableDataSource<Doctor>([]);
    displayedColumns: string[] = ['id', 'firstname', 'lastname', 'specialization'];

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
            error: (err) => console.error('Błąd podczas pobierania lekarzy:', err)
        });
    }

    onSubmit() {
        if (this.doctorForm.valid) {
            this.doctorService.addDoctor(this.doctorForm.value as Omit<Doctor, 'id'>).subscribe({
                next: () => {
                    this.loadDoctors();
                    this.doctorForm.reset();
                },
                error: (err) => console.error('Błąd podczas dodawania lekarza:', err)
            });
        }
    }
}