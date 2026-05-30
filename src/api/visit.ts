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

    // Pobieranie wszystkich wizyt (Harmonogram - posortowane chronologicznie)
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

    // Pobieranie historii wizyt konkretnego pacjenta (np. do raportów PDF)
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

    // Pobieranie harmonogramu konkretnego lekarza (do graficznego kalendarza)
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

    // NOWE: Inteligentne pobieranie wolnych terminów dla lekarza (Smart Calendar)
    app.get('/api/visits/available-slots/:doctorId', requireAuth(), (req: Request, res: Response, next: NextFunction) => {
        try {
            const doctorId = Number(req.params.doctorId);

            // Pobieramy wszystkie aktywne wizyty od dzisiaj wzwyż
            const stmt = db.prepare(`
                SELECT visitDate FROM visits 
                WHERE doctorId = ? AND status = 'zaplanowana' AND visitDate >= datetime('now')
            `);
            const bookedVisits = stmt.all(doctorId).map((v: any) => v.visitDate);

            const availableSlots: string[] = [];
            let currentDate = new Date();
            
            // Szukamy od jutra, zaczynając od 8:00
            currentDate.setDate(currentDate.getDate() + 1);
            currentDate.setHours(8, 0, 0, 0);

            // Generujemy 15 najbliższych okienek roboczych
            while (availableSlots.length < 15) {
                const day = currentDate.getDay();
                const hour = currentDate.getHours();

                // Dni robocze i godziny od 8:00 do 15:30 (zakończenie o 16:00)
                if (day !== 0 && day !== 6 && hour >= 8 && hour < 16) {
                    // Konwersja czasu z uwzględnieniem lokalnej strefy czasowej na format YYYY-MM-DDTHH:mm
                    const tzOffset = currentDate.getTimezoneOffset() * 60000;
                    const localIso = new Date(currentDate.getTime() - tzOffset).toISOString().slice(0, 16);

                    // Dodajemy termin tylko, jeśli baza go nie zwróciła
                    if (!bookedVisits.includes(localIso)) {
                        availableSlots.push(localIso);
                    }
                }

                // Skok o 30 minut do przodu
                currentDate.setMinutes(currentDate.getMinutes() + 30);

                // Powyżej 16:00 przerzucamy licznik na 8:00 rano kolejnego dnia
                if (currentDate.getHours() >= 16) {
                    currentDate.setDate(currentDate.getDate() + 1);
                    currentDate.setHours(8, 0, 0, 0);
                }
            }

            res.json(availableSlots);
        } catch (err) {
            next(err);
        }
    });

    // ZMODYFIKOWANE: Dodawanie wizyty (Automatyczny gabinet i blokada kolizji)
    // ZMODYFIKOWANE: Dodawanie wizyty z logowaniem audytu
    app.post('/api/visits', requireAuth(0, 2), (req: Request, res: Response, next: NextFunction) => {
        try {
            const { patientId, doctorId, visitDate } = req.body;
            
            if (!patientId || !doctorId || !visitDate) {
                return next(createError(400, 'Brakuje wymaganych danych pacjenta, lekarza lub daty.'));
            }

            const visitHour = new Date(visitDate).getHours();
            if (visitHour < 8 || visitHour >= 16) {
                return next(createError(400, 'Rejestracja możliwa tylko w godzinach 08:00 - 16:00.'));
            }

            const checkCollision = db.prepare(`
                SELECT count(*) as count FROM visits 
                WHERE doctorId = ? AND visitDate = ? AND status = 'zaplanowana'
            `).get(doctorId, visitDate) as any;

            if (checkCollision.count > 0) {
                return next(createError(409, 'Wykryto kolizję! Lekarz ma już zaplanowaną wizytę w tym terminie.'));
            }

            const doctorData = db.prepare(`
                SELECT r.name as roomName FROM doctors d 
                LEFT JOIN rooms r ON d.roomId = r.id 
                WHERE d.id = ?
            `).get(doctorId) as any;

            const roomName = (doctorData && doctorData.roomName) ? doctorData.roomName : 'Nieprzypisany';

           const stmt = db.prepare('INSERT INTO visits (patientId, doctorId, visitDate, room, status) VALUES (?, ?, ?, ?, ?)');
            const info = stmt.run(patientId, doctorId, visitDate, roomName, 'zaplanowana');
            
            // ROZWIĄZANIE: Konwertujemy typ 'number | bigint' na bezpieczny 'number'
            const insertId = Number(info.lastInsertRowid);
            
            // NOWE: Rejestrujemy utworzenie wizyty w systemie audytu!
            const newData = { patientId, doctorId, visitDate, room: roomName, status: 'zaplanowana' };
            AuditService.log(db, (req as any).user, 'CREATE', 'VISIT', insertId, null, newData, 'Rejestracja nowej wizyty');
            
            res.status(201).json({ id: insertId });
        } catch (err) {
            next(err);
        }
    });
    // Aktualizacja samego statusu wizyty
    // Aktualizacja samego statusu wizyty z logowaniem audytu
    app.patch('/api/visits/:id/status', requireAuth(0, 1, 2), (req: Request, res: Response, next: NextFunction) => {
        try {
            const visitId = Number(req.params.id);
            const { status } = req.body;
            
            // 1. Pobieramy stary stan do audytu
            const oldVisit = db.prepare('SELECT * FROM visits WHERE id = ?').get(visitId);
            if (!oldVisit) return next(createError(404, 'Nie znaleziono wizyty'));

            // 2. Aktualizujemy w bazie
            const stmt = db.prepare('UPDATE visits SET status = ? WHERE id = ?');
            stmt.run(status, visitId);
            
            // 3. Logujemy zmianę
            const newVisit = { ...(oldVisit as any), status };
            AuditService.log(db, (req as any).user, 'UPDATE', 'VISIT', visitId, oldVisit, newVisit, `Zmieniono status wizyty na: ${status}`);

            res.json({ message: 'Status zaktualizowany' });
        } catch (err) {
            next(err);
        }
    });

    // Usuwanie wizyty
    // Usuwanie wizyty z logowaniem audytu
    app.delete('/api/visits/:id', requireAuth(0, 2), (req: Request, res: Response, next: NextFunction) => {
        try {
            const visitId = Number(req.params.id);
            
            // 1. ZANIM usuniemy, musimy złapać dane z bazy, by wiedzieć CO usuwamy
            const oldVisit = db.prepare('SELECT * FROM visits WHERE id = ?').get(visitId);
            if (!oldVisit) return next(createError(404, 'Nie znaleziono wizyty'));

            // 2. Twarde usuwanie z tabeli
            const stmt = db.prepare('DELETE FROM visits WHERE id = ?');
            stmt.run(visitId);
            
            // 3. Zostawiamy ślad w audycie (new_data podajemy jako null)
            AuditService.log(db, (req as any).user, 'DELETE', 'VISIT', visitId, oldVisit, null, 'Trwałe usunięcie wizyty z systemu');

            res.json({ message: 'Wizyta odwołana' });
        } catch (err) {
            next(err);
        }
    });

    // Pełna aktualizacja wizyty (np. zmiana daty lub przypisanego ręcznie pokoju)
    app.put('/api/visits/:id', requireAuth(0, 2), (req: Request, res: Response, next: NextFunction) => {
        try {
            const visitId = Number(req.params.id);
            const { visitDate, status, room } = req.body; 
            
            // 1. Pobieramy stare dane do logu audytu
            const oldVisit = db.prepare('SELECT * FROM visits WHERE id = ?').get(visitId);
            
            // 2. Aktualizacja (dopuszcza ręczną zmianę pokoju przez administratora)
            const stmt = db.prepare('UPDATE visits SET visitDate = ?, status = ?, room = ? WHERE id = ?');
            const info = stmt.run(visitDate, status, room, visitId);

            if (info.changes === 0) return next(createError(404, 'Nie znaleziono wizyty do aktualizacji'));

            // 3. Zapisujemy w audycie
            AuditService.log(db, (req as any).user, 'UPDATE', 'VISIT', visitId, oldVisit, req.body);
            res.json({ message: 'Wizyta zaktualizowana pomyślnie' });

        } catch (err) {
            next(err);
        }
    });
}