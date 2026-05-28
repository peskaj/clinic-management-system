import { Application, Request, Response, NextFunction } from 'express';
import { DatabaseSync } from 'node:sqlite';
import { requireAuth } from '../auth';
import createError from 'http-errors';

export function initDoctorApi(app: Application, db: DatabaseSync) {
    
    app.get('/api/doctors', requireAuth(), (req: Request, res: Response, next: NextFunction) => {
        try {
            const doctors = db.prepare('SELECT * FROM doctors').all();
            res.json(doctors);
        } catch (err) {
            next(err);
        }
    });

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

    app.delete('/api/doctors/:id', requireAuth(0), (req: Request, res: Response, next: NextFunction) => {
        try {
            const doctorId = Number(req.params.id);
            const stmt = db.prepare('DELETE FROM doctors WHERE id = ?');
            const info = stmt.run(doctorId);
            if (info.changes === 0) return next(createError(404, 'Nie znaleziono lekarza do usunięcia'));
            res.json({ message: 'Usunięto pomyślnie' });
        } catch (err) {
            next(err);
        }
    });
}