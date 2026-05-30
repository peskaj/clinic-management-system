import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Office {
    id: number;
    name: string;
    type: string;
    assignedDoctor?: string;
    doctorId?: number;
}

@Injectable({
    providedIn: 'root'
})
export class OfficeService {
    private http = inject(HttpClient);
    
    // ZMIANA: Skracamy URL, aby Angular poprawnie dodał nagłówki autoryzacji!
    private apiUrl = '/api/offices'; 

    getOffices(): Observable<Office[]> {
        return this.http.get<Office[]>(this.apiUrl);
    }

    addOffice(office: Partial<Office>): Observable<any> {
        return this.http.post(this.apiUrl, office);
    }

    deleteOffice(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }
    updateOffice(id: number, office: Partial<Office>): Observable<any> {
        return this.http.put(`${this.apiUrl}/${id}`, office);
    }
}