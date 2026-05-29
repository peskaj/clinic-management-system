import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface Doctor {
    id: number;
    firstname: string;
    lastname: string;
    specialization: string;
}

@Injectable({
    providedIn: 'root'
})
export class DoctorService {
    private http = inject(HttpClient);
    private apiUrl = '/api/doctors';

    getDoctors(): Observable<Doctor[]> {
        return this.http.get<Doctor[]>(this.apiUrl);
    }

    addDoctor(doctor: Omit<Doctor, 'id'>): Observable<Doctor> {
        return this.http.post<Doctor>(this.apiUrl, doctor);
    }
    deleteDoctor(id: number): Observable<{ message: string }> {
        return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
    }
}