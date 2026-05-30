import { Application, Request, Response, NextFunction } from 'express';
import { DatabaseSync } from 'node:sqlite';
import { requireAuth } from '../auth';
import createError from 'http-errors';
import { AuditService } from '../services/audit.service';

export function initDoctorApi(app: Application, db: DatabaseSync) {
    // 1. Gwarancja istnienia tabeli lekarzy
    db.exec(`
        CREATE TABLE IF NOT EXISTS doctors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            firstname TEXT NOT NULL,
            lastname TEXT NOT NULL,
            specialization TEXT
        )
    `);

    // 2. Pobieranie wszystkich lekarzy
    app.get('/api/doctors', requireAuth(), (req: Request, res: Response, next: NextFunction) => {
        try {
            const doctors = db.prepare(`
                SELECT d.id, d.firstname, d.lastname, d.specialization, d.roomId, r.name AS roomName 
                FROM doctors d
                LEFT JOIN rooms r ON d.roomId = r.id
            `).all();
            res.json(doctors);
        } catch (err) {
            next(err);
        }
    });

    // 3. Dodawanie nowego lekarza
    app.post('/api/doctors', requireAuth(0), (req: Request, res: Response, next: NextFunction) => {
        try {
            const { firstname, lastname, specialization } = req.body;
            if (!firstname || !lastname) return next(createError(400, 'Imię i nazwisko są wymagane'));

            const stmt = db.prepare('INSERT INTO doctors (firstname, lastname, specialization) VALUES (?, ?, ?)');
            const info = stmt.run(firstname, lastname, specialization || null);
            res.status(201).json({ id: info.lastInsertRowid });
        } catch (err) {
            next(err);
        }
    });

    // 4. Aktualizacja lekarza
    app.put('/api/doctors/:id', requireAuth(0), (req: Request, res: Response, next: NextFunction) => {
        try {
            const doctorId = Number(req.params.id);
            const { firstname, lastname, specialization } = req.body;
            const stmt = db.prepare('UPDATE doctors SET firstname = ?, lastname = ?, specialization = ? WHERE id = ?');
            const info = stmt.run(firstname, lastname, specialization || null, doctorId);
            
            if (info.changes === 0) return next(createError(404, 'Nie znaleziono lekarza do aktualizacji'));
            res.json({ message: 'Zaktualizowano pomyślnie' });
        } catch (err) {
            next(err);
        }
    });

    // 5. Usuwanie lekarza
    app.delete('/api/doctors/:id', requireAuth(0), (req: Request, res: Response, next: NextFunction) => {
    try {
        const doctorId = Number(req.params.id);

        // 1. Pobieramy dane lekarza do audytu zanim zniknie
        const oldDoctor = db.prepare('SELECT * FROM doctors WHERE id = ?').get(doctorId);
        if (!oldDoctor) {
             return res.status(404).json({ message: 'Nie znaleziono lekarza' });
        }

        // 2. KLUCZOWY KROK: Najpierw usuwamy wszystkie wizyty powiązane z tym lekarzem.
        // To zwalnia blokadę klucza obcego (Foreign Key) w bazie danych!
        db.prepare('DELETE FROM visits WHERE doctorId = ?').run(doctorId);

        // 3. Teraz bezpiecznie usuwamy samego lekarza
        const stmt = db.prepare('DELETE FROM doctors WHERE id = ?');
        stmt.run(doctorId);

        // 4. Rejestrujemy akcję w naszym nowym, pancernym audycie
        AuditService.log(db, (req as any).user, 'DELETE', 'DOCTOR', doctorId, oldDoctor, null, 'Usunięto lekarza oraz wszystkie jego zaplanowane wizyty');

        res.json({ message: 'Lekarz i jego wizyty zostali trwale usunięci z systemu.' });

    } catch (err) {
        next(err);
    }
});
}