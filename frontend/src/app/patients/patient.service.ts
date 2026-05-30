import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface Patient {
    id: number;
    firstname: string;
    lastname: string;
    pesel: string;
    phone: string;
}

@Injectable({
    providedIn: 'root'
})
export class PatientService {
    private http = inject(HttpClient);
    private apiUrl = '/api/patients';

    getPatients(): Observable<Patient[]> {
        return this.http.get<Patient[]>(this.apiUrl);
    }

    // Nowa metoda do wysyłania danych na serwer
    addPatient(patient: Omit<Patient, 'id'>): Observable<Patient> {
        return this.http.post<Patient>(this.apiUrl, patient);
    }
    
    importPatients(patients: Omit<Patient, 'id'>[]): Observable<{ importedCount: number }> {
        return this.http.post<{ importedCount: number }>(`${this.apiUrl}/bulk`, patients);
    }
    updatePatient(id: number, data: any) {
    return this.http.put(`/api/patients/${id}`, data);
    }
    deletePatient(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }
}