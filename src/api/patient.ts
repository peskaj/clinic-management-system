import { AuditService } from '../services/audit.service'; // Dostosuj ścieżkę, jeśli plik jest w innym folderze
import { Application, Request, Response, NextFunction } from 'express';
import { DatabaseSync } from 'node:sqlite';
import { requireAuth } from '../auth';
import createError from 'http-errors';

export function initPatientApi(app: Application, db: DatabaseSync) {
    // 1. Gwarancja istnienia tabeli w bazie
    db.exec(`
        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            firstname TEXT NOT NULL,
            lastname TEXT NOT NULL,
            pesel TEXT UNIQUE,
            phone TEXT
        )
    `);

    // 2. Pobieranie wszystkich pacjentów (Tutaj był błąd 404!)
    app.get('/api/patients', requireAuth(), (req: Request, res: Response, next: NextFunction) => {
    try {
        const patients = db.prepare('SELECT * FROM patients').all();
        res.json(patients);
    } catch (err) {
        next(err);
    }
});

    // 3. Pobieranie jednego pacjenta po ID
    app.get('/api/patients/:id', requireAuth(), (req: Request, res: Response, next: NextFunction) => {
    try {
        const patientId = Number(req.params.id);
        const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
        if (!patient) return next(createError(404, 'Nie znaleziono pacjenta'));
        res.json(patient);
    } catch (err) {
        next(err);
    }
});

    // ==========================================
    // 4. Dodawanie pacjentów (Masowe oraz Pojedyncze)
    // ==========================================

    // A) NOWE/MASOWE: Masowy import pacjentów z pliku (BULK)
    // Ważne, aby ten endpoint był WYŻEJ, przed ogólnym POST /api/patients
    app.post('/api/patients/bulk', requireAuth(0, 2), (req: Request, res: Response, next: NextFunction) => {
        try {
            const patients = req.body;
            if (!Array.isArray(patients)) return next(createError(400, 'Oczekiwano tablicy pacjentów'));

            let importedCount = 0;
            const stmt = db.prepare('INSERT INTO patients (firstname, lastname, pesel, phone) VALUES (?, ?, ?, ?)');

            // Używamy transakcji dla maksymalnej wydajności i bezpieczeństwa
            db.exec('BEGIN TRANSACTION');
            try {
                for (const p of patients) {
                    if (!p.firstname || !p.lastname) continue; // Pomijamy uszkodzone rekordy
                    try {
                        stmt.run(p.firstname, p.lastname, p.pesel || null, p.phone || null);
                        importedCount++;
                    } catch (e: any) {
                        // Jeśli PESEL już istnieje, po prostu go ignorujemy i lecimy dalej
                        if (!e.message.includes('UNIQUE')) throw e; 
                    }
                }
                db.exec('COMMIT');
            } catch (err) {
                db.exec('ROLLBACK');
                throw err;
            }

            res.status(201).json({ importedCount });
        } catch (err) {
            next(err);
        }
    });

    // B) POJEDYNCZE: Dodawanie jednego pacjenta z formularza
    app.post('/api/patients', requireAuth(0, 2), (req: Request, res: Response, next: NextFunction) => {
        try {
            const { firstname, lastname, pesel, phone } = req.body;
            
            // Walidacja pól wymaganych
            if (!firstname || !lastname) {
                return next(createError(400, 'Imię i nazwisko są wymagane'));
            }

            const stmt = db.prepare('INSERT INTO patients (firstname, lastname, pesel, phone) VALUES (?, ?, ?, ?)');
            const info = stmt.run(firstname, lastname, pesel || null, phone || null);

            res.status(201).json({ 
                message: 'Dodano pacjenta pomyślnie',
                id: info.lastInsertRowid 
            });

        } catch (err: any) {
            if (err.message.includes('UNIQUE')) {
                return next(createError(409, 'Pacjent z tym numerem PESEL już istnieje'));
            }
            next(err);
        }
    });
// Trwałe usuwanie pacjenta (tylko dla Admina - rola 0)
    app.delete('/api/patients/:id', requireAuth(0), (req: Request, res: Response, next: NextFunction) => {
        try {
            const patientId = Number(req.params.id);

            // 1. ZANIM usuniemy, łapiemy dane do logu audytu
            const oldPatient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
            if (!oldPatient) return next(createError(404, 'Nie znaleziono pacjenta'));

            // 2. Startujemy twardą transakcję, by zachować absolutną spójność
            db.exec('BEGIN TRANSACTION');

            // 3. Najpierw usuwamy z bazy wszystkie wizyty tego pacjenta (zwalnia klucz obcy)
            db.prepare('DELETE FROM visits WHERE patientId = ?').run(patientId);

            // 4. Teraz bezpiecznie usuwamy samego pacjenta
            db.prepare('DELETE FROM patients WHERE id = ?').run(patientId);

            db.exec('COMMIT');

            // 5. Zostawiamy niezatarty ślad w audycie
            AuditService.log(db, (req as any).user, 'DELETE', 'PATIENT', patientId, oldPatient, null, 'Usunięto pacjenta oraz całą jego historię wizyt');

            res.json({ message: 'Pacjent i jego wizyty zostali trwale usunięci.' });
        } catch (err) {
            db.exec('ROLLBACK'); // W razie awarii cofamy wszystko
            next(err);
        }
    });
    // 5. Aktualizacja pacjenta
    app.put('/api/patients/:id', requireAuth(0, 2), (req: Request, res: Response, next: NextFunction) => {
        try {
            const patientId = Number(req.params.id);
            const { firstname, lastname, pesel, phone } = req.body;
            const oldPatient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
            const stmt = db.prepare('UPDATE patients SET firstname = ?, lastname = ?, pesel = ?, phone = ? WHERE id = ?');            
            const info = stmt.run(firstname, lastname, pesel || null, phone || null, patientId);
            
            if (info.changes === 0) return next(createError(404, 'Nie znaleziono pacjenta do aktualizacji'));

            if (info.changes > 0) {
                // 1. Zapisujemy w audycie (teraz jest kuloodporny)
                AuditService.log(db, (req as any).user, 'UPDATE', 'PATIENT', patientId, oldPatient, req.body);
                
                // 2. Kończymy zapytanie i wysyłamy 200 OK do Angulara
                res.json({ message: 'Zaktualizowano pomyślnie' });
            }

        } catch (err: any) {
            if (err.message.includes('UNIQUE')) return next(createError(409, 'Inny pacjent ma już ten numer PESEL'));
            next(err);
        }
    });

    // 6. Usuwanie pacjenta
    // Trwałe usuwanie pacjenta (tylko dla Admina - rola 0)
    app.delete('/api/patients/:id', requireAuth(0), (req: Request, res: Response, next: NextFunction) => {
        try {
            const patientId = Number(req.params.id);

            // 1. ZANIM usuniemy, łapiemy dane do logu audytu
            const oldPatient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
            if (!oldPatient) return next(createError(404, 'Nie znaleziono pacjenta'));

            // 2. Startujemy twardą transakcję, by zachować absolutną spójność
            db.exec('BEGIN TRANSACTION');

            // 3. Najpierw usuwamy z bazy wszystkie wizyty tego pacjenta (zwalnia klucz obcy)
            db.prepare('DELETE FROM visits WHERE patientId = ?').run(patientId);

            // 4. Teraz bezpiecznie usuwamy samego pacjenta
            db.prepare('DELETE FROM patients WHERE id = ?').run(patientId);

            db.exec('COMMIT');

            // 5. Zostawiamy niezatarty ślad w audycie
            AuditService.log(db, (req as any).user, 'DELETE', 'PATIENT', patientId, oldPatient, null, 'Usunięto pacjenta oraz całą jego historię wizyt');

            res.json({ message: 'Pacjent i jego wizyty zostali trwale usunięci.' });
        } catch (err) {
            db.exec('ROLLBACK'); // W razie awarii cofamy wszystko
            next(err);
        }
    });
}