import { Application, Request, Response, NextFunction } from 'express';
import { DatabaseSync } from 'node:sqlite';
import { requireAuth } from '../auth';
import { AuditService } from '../services/audit.service';
import createError from 'http-errors';

export function initVisitApi(app: Application, db: DatabaseSync) {
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

    // Bezpieczna aktualizacja bazy - dodanie statusu "w locie"
    try {
        db.exec(`ALTER TABLE visits ADD COLUMN status TEXT DEFAULT 'zaplanowana'`);
    } catch (e) {
        // Kolumna już istnieje - ignorujemy
    }

    const accessRoles = [0, 2];

    // Pobieranie wizyt (Harmonogram - posortowane chronologicznie)

    app.get('/api/visits', requireAuth(), (req: Request, res: Response, next: NextFunction) => {
            try {
                const visits = db.prepare(`
                    SELECT v.id, v.visitDate, v.room, v.status, 
                        p.firstname AS patientFirstname, p.lastname AS patientLastname,
                        d.firstname AS doctorFirstname, d.lastname AS doctorLastname
                    FROM visits v
                    JOIN patients p ON v.patientId = p.id
                    JOIN doctors d ON v.doctorId = d.id
                    ORDER BY v.visitDate DESC
                `).all();
                res.json(visits);
            } catch (err) {
                next(err);
            }
    });

    // NOWE 1: Pobieranie historii wizyt konkretnego pacjenta (do raportu PDF)
    app.get('/api/visits/patient/:id', requireAuth(), (req: Request, res: Response, next: NextFunction) => {
        try {
            const patientId = Number(req.params.id);
            const visits = db.prepare(`
                SELECT v.id, v.visitDate, v.room, v.status, 
                       d.firstname AS doctorFirstname, d.lastname AS doctorLastname, d.specialization
                FROM visits v
                JOIN doctors d ON v.doctorId = d.id
                WHERE v.patientId = ?
                ORDER BY v.visitDate DESC
            `).all(patientId);
            res.json(visits);
        } catch (err) {
            next(err);
        }
    });

    // NOWE 2: Pobieranie harmonogramu konkretnego lekarza (do graficznego kalendarza)
    app.get('/api/visits/doctor/:id', requireAuth(), (req: Request, res: Response, next: NextFunction) => {
        try {
            const doctorId = Number(req.params.id);
            const visits = db.prepare(`
                SELECT v.id, v.visitDate, v.room, v.status, 
                       p.firstname AS patientFirstname, p.lastname AS patientLastname
                FROM visits v
                JOIN patients p ON v.patientId = p.id
                WHERE v.doctorId = ?
                ORDER BY v.visitDate ASC
            `).all(doctorId);
            res.json(visits);
        } catch (err) {
            next(err);
        }
    });

    app.post('/api/visits', requireAuth(0, 2), (req: Request, res: Response, next: NextFunction) => {
        try {
            const { patientId, doctorId, visitDate, room } = req.body;
            if (!patientId || !doctorId || !visitDate || !room) {
                return next(createError(400, 'Wszystkie pola są wymagane'));
            }

            const stmt = db.prepare('INSERT INTO visits (patientId, doctorId, visitDate, room, status) VALUES (?, ?, ?, ?, ?)');
            const info = stmt.run(patientId, doctorId, visitDate, room, 'zaplanowana');
            res.status(201).json({ id: info.lastInsertRowid });
        } catch (err) {
            next(err);
        }
    });

    // NOWE: Aktualizacja samego statusu wizyty
    app.patch('/api/visits/:id/status', requireAuth(0, 1, 2), (req: Request, res: Response, next: NextFunction) => {
        try {
            const visitId = Number(req.params.id);
            const { status } = req.body;
            const stmt = db.prepare('UPDATE visits SET status = ? WHERE id = ?');
            const info = stmt.run(status, visitId);
            
            if (info.changes === 0) return next(createError(404, 'Nie znaleziono wizyty'));
            res.json({ message: 'Status zaktualizowany' });
        } catch (err) {
            next(err);
        }
    });

    app.delete('/api/visits/:id', requireAuth(0, 2), (req: Request, res: Response, next: NextFunction) => {
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

    app.put('/api/visits/:id', requireAuth(0, 2), (req: Request, res: Response, next: NextFunction) => {
    try {
        const visitId = Number(req.params.id);
        const { visitDate, status, room } = req.body; 
        
        // 1. Pobieramy stare dane do logu z poprawnej tabeli (visits)
        const oldVisit = db.prepare('SELECT * FROM visits WHERE id = ?').get(visitId);
        
        // 2. Aktualizujemy odpowiednie kolumny w tabeli visits
        const stmt = db.prepare('UPDATE visits SET visitDate = ?, status = ?, room = ? WHERE id = ?');
        const info = stmt.run(visitDate, status, room, visitId);

        if (info.changes === 0) return next(createError(404, 'Nie znaleziono wizyty do aktualizacji'));

        // 3. Zapisujemy w audycie i zwracamy sukces
        AuditService.log(db, (req as any).user, 'UPDATE', 'VISIT', visitId, oldVisit, req.body);
        res.json({ message: 'Wizyta zaktualizowana pomyślnie' });

    } catch (err) {
        next(err);
    }
});
}