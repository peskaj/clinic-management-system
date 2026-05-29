import { Application, Request, Response, NextFunction } from 'express';
import { DatabaseSync } from 'node:sqlite';
import { requireAuth } from '../auth';
import createError from 'http-errors';

export function initVisitApi(app: Application, db: DatabaseSync) {
    // 1. Inicjalizacja tabeli wizyt z relacjami
    db.exec(`
        CREATE TABLE IF NOT EXISTS visits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patientId INTEGER NOT NULL,
            doctorId INTEGER NOT NULL,
            visitDate TEXT NOT NULL,
            room TEXT NOT NULL,
            FOREIGN KEY (patientId) REFERENCES patients(id),
            FOREIGN KEY (doctorId) REFERENCES doctors(id)
        )
    `);

    const accessRoles = [0, 2]; // Uprawnienia: Admin i Recepcja

    // 2. Pobieranie wizyt (od razu połączone z danymi ludzi!)
    app.get('/api/visits', requireAuth(), (req: Request, res: Response, next: NextFunction) => {
        try {
            const visits = db.prepare(`
                SELECT 
                    v.id, 
                    v.visitDate, 
                    v.room,
                    v.patientId,
                    p.firstname AS patientFirstname, p.lastname AS patientLastname,
                    v.doctorId,
                    d.firstname AS doctorFirstname, d.lastname AS doctorLastname
                FROM visits v
                JOIN patients p ON v.patientId = p.id
                JOIN doctors d ON v.doctorId = d.id
            `).all();
            res.json(visits);
        } catch (err) {
            next(err);
        }
    });

    // 3. Dodawanie nowej wizyty (Rejestracja)
    app.post('/api/visits', requireAuth(...accessRoles), (req: Request, res: Response, next: NextFunction) => {
        try {
            const { patientId, doctorId, visitDate, room } = req.body;
            if (!patientId || !doctorId || !visitDate || !room) {
                return next(createError(400, 'Wszystkie pola są wymagane'));
            }

            const stmt = db.prepare('INSERT INTO visits (patientId, doctorId, visitDate, room) VALUES (?, ?, ?, ?)');
            const info = stmt.run(patientId, doctorId, visitDate, room);
            res.status(201).json({ id: info.lastInsertRowid });
        } catch (err) {
            next(err);
        }
    });

    // 4. Odwoływanie wizyty
    app.delete('/api/visits/:id', requireAuth(...accessRoles), (req: Request, res: Response, next: NextFunction) => {
        try {
            const visitId = Number(req.params.id);
            const stmt = db.prepare('DELETE FROM visits WHERE id = ?');
            const info = stmt.run(visitId);
            if (info.changes === 0) return next(createError(404, 'Nie znaleziono wizyty'));
            res.json({ message: 'Wizyta odwołana' });
        } catch (err) {
            next(err);
        }
    });
}