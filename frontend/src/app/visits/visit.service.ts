import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface Visit {
    id: number;
    patientId: number;
    doctorId: number;
    visitDate: string;
    room: string;
    status: string; // Nowe pole
    patientFirstname?: string;
    patientLastname?: string;
    doctorFirstname?: string;
    doctorLastname?: string;
}

export interface VisitCreate {
    patientId: number;
    doctorId: number;
    visitDate: string;
    room: string;
}

@Injectable({
    providedIn: 'root'
})
export class VisitService {
    private http = inject(HttpClient);
    private apiUrl = '/api/visits';

    getVisits(): Observable<Visit[]> {
        return this.http.get<Visit[]>(this.apiUrl);
    }

    addVisit(visit: VisitCreate): Observable<{ id: number }> {
        return this.http.post<{ id: number }>(this.apiUrl, visit);
    }

    // Nowa metoda do zmiany statusu
    updateStatus(id: number, status: string): Observable<{ message: string }> {
        return this.http.patch<{ message: string }>(`${this.apiUrl}/${id}/status`, { status });
    }

    deleteVisit(id: number): Observable<{ message: string }> {
        return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
    }
    // Pobieranie historii konkretnego pacjenta (do PDF)
    getPatientVisits(patientId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/patient/${patientId}`);
    }

    // Pobieranie harmonogramu konkretnego lekarza (do Kalendarza)
    getDoctorVisits(doctorId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/doctor/${doctorId}`);
    }
}