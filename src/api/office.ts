import { Application, Request, Response, NextFunction } from 'express';
import { DatabaseSync } from 'node:sqlite';
import { requireAuth } from '../auth';
import createError from 'http-errors';

export function initOfficeApi(app: Application, db: DatabaseSync) {
    // 1. Gwarancja istnienia tabeli gabinetów
    db.exec(`
        CREATE TABLE IF NOT EXISTS rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            type TEXT
        )
    `);

    // 2. Pobieranie listy gabinetów wraz z lekarzami (dostęp: admin, lekarz, recepcja)
    app.get('/api/offices', requireAuth(), (req: Request, res: Response, next: NextFunction) => {
        try {
            const stmt = db.prepare(`
                SELECT r.id, r.name, r.type, d.id as doctorId, d.firstname, d.lastname 
                FROM rooms r
                LEFT JOIN doctors d ON d.roomId = r.id
            `);
            
            const offices = stmt.all().map((row: any) => ({
                id: row.id,
                name: row.name,
                type: row.type,
                doctorId: row.doctorId,
                assignedDoctor: row.firstname ? `${row.firstname} ${row.lastname}` : null
            }));
            
            res.json(offices);
        } catch (err) {
            next(err);
        }
    });

    // 3. Dodawanie gabinetu i przypisywanie lekarza (dostęp: tylko admin, rola 0)
    app.post('/api/offices', requireAuth(0), (req: Request, res: Response, next: NextFunction) => {
        try {
            const { name, type, doctorId } = req.body;

            if (!name || !type) {
                return next(createError(400, 'Nazwa i typ gabinetu są wymagane'));
            }

            // Rozpoczynamy natywną transakcję SQL
            db.exec('BEGIN TRANSACTION');
            
            const insertRoom = db.prepare(`INSERT INTO rooms (name, type) VALUES (?, ?)`);
            const info = insertRoom.run(name, type);
            const newRoomId = info.lastInsertRowid;

            // Jeśli wybrano lekarza, aktualizujemy jego profil o przypisany pokój
            if (doctorId) {
                db.prepare(`UPDATE doctors SET roomId = ? WHERE id = ?`).run(newRoomId, doctorId);
            }
            
            db.exec('COMMIT');

            res.status(201).json({ message: 'Gabinet dodany pomyślnie!', id: newRoomId });
        } catch (err: any) {
            db.exec('ROLLBACK'); // W razie błędu cofamy wszystkie zmiany z bazy
            
            if (err.message && err.message.includes('UNIQUE constraint failed')) {
                return next(createError(400, 'Konflikt! Gabinet o tej nazwie już istnieje.'));
            }
            next(err);
        }
    });

    // 4. Usuwanie gabinetu (dostęp: tylko admin, rola 0)
    app.delete('/api/offices/:id', requireAuth(0), (req: Request, res: Response, next: NextFunction) => {
        try {
            const roomId = Number(req.params.id);

            const stmt = db.prepare(`DELETE FROM rooms WHERE id = ?`);
            const info = stmt.run(roomId);

            if (info.changes === 0) {
                return next(createError(404, 'Nie znaleziono gabinetu'));
            }

            res.json({ message: 'Gabinet został usunięty.' });
        } catch (err) {
            next(err);
        }
    });

    app.put('/api/offices/:id', requireAuth(0), (req: Request, res: Response, next: NextFunction) => {
        try {
            const roomId = Number(req.params.id);
            const { name, type, doctorId } = req.body;

            if (!name || !type) {
                return next(createError(400, 'Nazwa i typ gabinetu są wymagane'));
            }

            db.exec('BEGIN TRANSACTION');
            
            // A. Aktualizacja danych samego gabinetu
            const stmt = db.prepare('UPDATE rooms SET name = ?, type = ? WHERE id = ?');
            const info = stmt.run(name, type, roomId);

            if (info.changes === 0) {
                db.exec('ROLLBACK');
                return next(createError(404, 'Nie znaleziono gabinetu'));
            }

            // B. Czyścimy przypisanie - usuwamy ten gabinet każdemu lekarzowi, który wcześniej go miał
            db.prepare('UPDATE doctors SET roomId = NULL WHERE roomId = ?').run(roomId);

            // C. Jeśli w formularzu wybrano nowego lekarza, nadajemy mu ten gabinet
            if (doctorId) {
                db.prepare('UPDATE doctors SET roomId = ? WHERE id = ?').run(roomId, doctorId);
            }
            
            db.exec('COMMIT');
            res.json({ message: 'Gabinet zaktualizowany pomyślnie' });
        } catch (err: any) {
            db.exec('ROLLBACK');
            if (err.message && err.message.includes('UNIQUE constraint failed')) {
                return next(createError(400, 'Konflikt! Gabinet o tej nazwie już istnieje.'));
            }
            next(err);
        }
    });
}