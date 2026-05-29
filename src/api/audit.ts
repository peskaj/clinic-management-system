import { Application, Request, Response, NextFunction } from 'express';
import { DatabaseSync } from 'node:sqlite';
import { requireAuth } from '../auth'; // Upewnij się, że ścieżka do middleware'a auth jest poprawna
import createError from 'http-errors';

export function initAuditApi(app: Application, db: DatabaseSync) {
    
    // GET /api/audit - Pobieranie pełnej historii zmian (tylko dla Admina)
    app.get('/api/audit', requireAuth(0), (req: Request, res: Response, next: NextFunction) => {
        try {
            // Pobieramy logi, od najnowszych do najstarszych (ORDER BY timestamp DESC)
            // Limit 100 żeby nie zapchać przeglądarki, gdy system będzie działał rok
            const stmt = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100');
            const logs = stmt.all();
            
            res.json(logs);
        } catch (err) {
            next(err);
        }
    });

}