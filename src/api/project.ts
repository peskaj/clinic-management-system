import { Router, Request, Response } from 'express';
import { DatabaseSync } from 'node:sqlite';

class Project {
    id?: number;
    name: string;
    shortname: string;
    manager_id?: number;

    constructor(data: unknown) {
        if (typeof data !== 'object' || Array.isArray(data) || data === null) {
            throw new Error('Project musi być pojedynczym obiektem');
        }
        const obj = data as Record<string, any>;

        if (typeof obj.name !== 'string' || obj.name.trim().length === 0) {
            throw new Error('Pole name jest wymagane i nie może być puste');
        }
        if (typeof obj.shortname !== 'string' || obj.shortname.trim().length === 0) {
            throw new Error('Pole shortname jest wymagane i nie może być puste');
        }
        this.name = obj.name.trim();
        this.shortname = obj.shortname.trim();

        if (obj.manager_id !== undefined && obj.manager_id !== null && obj.manager_id !== '') {
            if (typeof obj.manager_id !== 'number' || !Number.isInteger(obj.manager_id) || obj.manager_id <= 0) {
                throw new Error('Pole manager_id musi być liczbą całkowitą większą od zera');
            }
            this.manager_id = obj.manager_id;
        }

        if (typeof obj.id === 'number') {
            this.id = obj.id;
        }
    }
}

export function projectRouter(connection: DatabaseSync): Router {
    const router = Router();

    router.post('/', async (req: Request, res: Response, next) => {
        try {
            const project = new Project(req.body);
            const created = connection.prepare(
                'INSERT INTO projects (name, shortname, manager_id) VALUES (?, ?, ?) RETURNING *'
            ).get(project.name, project.shortname, project.manager_id ?? null);
            res.json(created);
        } catch (err) {
            next(err);
        }
    });

    router.put('/', async (req: Request, res: Response, next) => {
        try {
            const project = new Project(req.body);
            if (!project.id) {
                throw new Error('Pole id jest wymagane do modyfikacji rekordu');
            }
            const updated = connection.prepare(`
                UPDATE projects
                SET name = ?, shortname = ?, manager_id = ?
                WHERE id = ?
                RETURNING *
            `).get(project.name, project.shortname, project.manager_id ?? null, project.id);
            if (!updated) {
                throw new Error(`Nie znaleziono projektu o id=${project.id}`);
            }
            res.json(updated);
        } catch (err) {
            next(err);
        }
    });

    router.get('/', async (req: Request, res: Response) => {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
        const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
        const filter = req.query.filter ? `${(req.query.filter as string).trim()}%` : null;
        const total = (connection.prepare('SELECT COUNT(*) AS count FROM projects').get() as { count: number }).count;
        let filtered: number;
        let data: unknown[];
        if (filter) {
            filtered = (connection.prepare(
                'SELECT COUNT(*) AS count FROM projects WHERE name LIKE ? OR shortname LIKE ?'
            ).get(filter, filter) as { count: number }).count;
            data = connection.prepare(`
                SELECT * FROM projects WHERE name LIKE ? OR shortname LIKE ?
                LIMIT ? OFFSET ?
            `).all(filter, filter, limit, offset);
        } else {
            filtered = total;
            data = connection.prepare('SELECT * FROM projects LIMIT ? OFFSET ?').all(limit, offset);
        }
        res.json({ total, filtered, data });
    });

    router.delete('/', async (req: Request, res: Response) => {
        let deleted: unknown = {};
        const id = req.query.id ? parseInt(req.query.id as string) : 0;
        if (id) {
            deleted = connection.prepare(`
                DELETE FROM projects WHERE id = ? RETURNING *
            `).get(id);
        }
        res.json(deleted);
    });

    return router;
}