import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../material/material-module';
import { HttpClient } from '@angular/common/http';
import { MatTableDataSource } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';

interface AuditLog {
    id: number;
    user_email: string;
    action: string;
    entity_type: string;
    entity_id: number;
    old_data: string;
    new_data: string;
    timestamp: string;
}

@Component({
    selector: 'app-audit',
    standalone: true,
    // DODAJ TUTAJ MatChipsModule:
    imports: [CommonModule, MaterialModule, MatChipsModule], 
    templateUrl: './audit.html'
})
export class Audit implements OnInit {
    private http = inject(HttpClient);
    
    dataSource = new MatTableDataSource<AuditLog>([]);
    displayedColumns: string[] = ['timestamp', 'user_email', 'action', 'entity', 'details'];

    ngOnInit() {
        this.http.get<AuditLog[]>('/api/audit').subscribe({
            next: (data) => this.dataSource.data = data,
            error: (err) => console.error('Błąd pobierania audytu', err)
        });
    }

    // Funkcja pomocnicza do ładnego formatowania JSON w tabeli
    formatData(data: string): string {
        if (!data || data === 'null') return '-';
        try {
            const parsed = JSON.parse(data);
            return JSON.stringify(parsed, null, 2);
        } catch {
            return data;
        }
    }
}