import { Router, Request, Response } from 'express';
import { DatabaseSync } from 'node:sqlite';
import { requireAuth } from '../auth';
class Person {
    id?: number;
    firstname: string;
    lastname: string;
    email?: string;
    birthdate?: string;

    constructor(data: unknown) {
        if (typeof data !== 'object' || Array.isArray(data) || data === null) {
            throw new Error('Person musi być pojedynczym obiektem');
        }
        const obj = data as Record<string, any>;

        if (typeof obj.firstname !== 'string' || obj.firstname.trim().length === 0) {
            throw new Error('Pole firstname jest wymagane i nie może być puste');
        }
        if (typeof obj.lastname !== 'string' || obj.lastname.trim().length === 0) {
            throw new Error('Pole lastname jest wymagane i nie może być puste');
        }
        this.firstname = obj.firstname.trim();
        this.lastname = obj.lastname.trim();

        if (obj.email !== undefined && obj.email !== null && obj.email !== '') {
            if (typeof obj.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(obj.email.trim())) {
                throw new Error('Pole email ma nieprawidłowy format');
            }
            this.email = obj.email.trim();
        }

        if (obj.birthdate !== undefined && obj.birthdate !== null && obj.birthdate !== '') {
            if (typeof obj.birthdate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(obj.birthdate.trim())
                || isNaN(Date.parse(obj.birthdate.trim()))) {
                throw new Error('Pole birthdate musi mieć format YYYY-MM-DD');
            }
            this.birthdate = obj.birthdate.trim();
        }

        if (typeof obj.id === 'number') {
            this.id = obj.id;
        }
    }
}

export function personRouter(connection: DatabaseSync): Router {
    const router = Router();

    router.post('/', requireAuth(0), async (req: Request, res: Response, next) => {
        try {
            const person = new Person(req.body);
            const created = connection.prepare(
                'INSERT INTO persons (firstname, lastname, email, birthdate) VALUES (?, ?, ?, ?) RETURNING *'
            ).get(person.firstname, person.lastname, person.email ?? null, person.birthdate ?? null);
            res.json(created);
        } catch (err) {
            next(err);
        }
    });

    router.put('/', requireAuth(0), async (req: Request, res: Response, next) => {
        try {
            const person = new Person(req.body);
            if (!person.id) {
                throw new Error('Pole id jest wymagane do modyfikacji rekordu');
            }
            const updated = connection.prepare(`
                UPDATE persons
                SET firstname = ?, lastname = ?, email = ?, birthdate = ?
                WHERE id = ?
                RETURNING *
            `).get(person.firstname, person.lastname, person.email ?? null, person.birthdate ?? null, person.id);
            if (!updated) {
                throw new Error(`Nie znaleziono osoby o id=${person.id}`);
            }
            res.json(updated);
        } catch (err) {
            next(err);
        }
    });

    router.get('/', requireAuth(0, 1), async (req: Request, res: Response) => {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
        const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
        const filter = req.query.filter ? `${(req.query.filter as string).trim()}%` : null;
        const total = (connection.prepare('SELECT COUNT(*) AS count FROM persons').get() as { count: number }).count;
        let filtered: number;
        let data: unknown[];
        if (filter) {
            filtered = (connection.prepare(
                'SELECT COUNT(*) AS count FROM persons WHERE firstname LIKE ? OR lastname LIKE ?'
            ).get(filter, filter) as { count: number }).count;
            data = connection.prepare(`
                SELECT * FROM persons WHERE firstname LIKE ? OR lastname LIKE ?
                LIMIT ? OFFSET ?
            `).all(filter, filter, limit, offset);
        } else {
            filtered = total;
            data = connection.prepare('SELECT * FROM persons LIMIT ? OFFSET ?').all(limit, offset);
        }
        res.json({ total, filtered, data });
    });

    router.delete('/', requireAuth(0), async (req: Request, res: Response) => {
        let deleted: unknown = {};
        const id = req.query.id ? parseInt(req.query.id as string) : 0;
        if (id) {
            deleted = connection.prepare(`
                DELETE FROM persons WHERE id = ? RETURNING *
            `).get(id);
        }
        res.json(deleted);
    });

    router.get('/histogram', async (req: Request, res: Response) => {
        const data = (connection.prepare(`
            SELECT
                count(1) AS count,
                strftime('%Y',birthdate)/10*10 AS decade
                FROM persons
                GROUP BY decade
                ORDER BY decade
        `)).all();
        res.json(data);
    });

    return router;
}
