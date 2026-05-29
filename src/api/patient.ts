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

    const accessRoles = [0, 2];

    // 2. Pobieranie wszystkich pacjentów (Tutaj był błąd 404!)
    app.get('/api/patients', requireAuth(...accessRoles), (req: Request, res: Response, next: NextFunction) => {
        try {
            const patients = db.prepare('SELECT * FROM patients').all();
            res.json(patients);
        } catch (err) {
            next(err);
        }
    });

    // 3. Pobieranie jednego pacjenta po ID
    app.get('/api/patients/:id', requireAuth(...accessRoles), (req: Request, res: Response, next: NextFunction) => {
        try {
            const patientId = Number(req.params.id);
            const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
            if (!patient) return next(createError(404, 'Nie znaleziono pacjenta'));
            res.json(patient);
        } catch (err) {
            next(err);
        }
    });

    // 4. Dodawanie nowego pacjenta
    // NOWE: Masowy import pacjentów z pliku
    app.post('/api/patients/bulk', requireAuth(...accessRoles), (req: Request, res: Response, next: NextFunction) => {
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

    // 5. Aktualizacja pacjenta
    app.put('/api/patients/:id', requireAuth(...accessRoles), (req: Request, res: Response, next: NextFunction) => {
        try {
            const patientId = Number(req.params.id);
            const { firstname, lastname, pesel, phone } = req.body;
            const stmt = db.prepare('UPDATE patients SET firstname = ?, lastname = ?, pesel = ?, phone = ? WHERE id = ?');
            const info = stmt.run(firstname, lastname, pesel || null, phone || null, patientId);
            
            if (info.changes === 0) return next(createError(404, 'Nie znaleziono pacjenta do aktualizacji'));
            res.json({ message: 'Zaktualizowano pomyślnie' });
        } catch (err: any) {
            if (err.message.includes('UNIQUE')) return next(createError(409, 'Inny pacjent ma już ten numer PESEL'));
            next(err);
        }
    });

    // 6. Usuwanie pacjenta
    app.delete('/api/patients/:id', requireAuth(0), (req: Request, res: Response, next: NextFunction) => {
        try {
            const patientId = Number(req.params.id);
            const stmt = db.prepare('DELETE FROM patients WHERE id = ?');
            const info = stmt.run(patientId);
            if (info.changes === 0) return next(createError(404, 'Nie znaleziono pacjenta do usunięcia'));
            res.json({ message: 'Usunięto pomyślnie' });
        } catch (err) {
            next(err);
        }
    });
}