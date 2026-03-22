import { Router, Request, Response } from 'express';
import { Database } from 'sqlite';

class Person {
    private static seq: number = 0;
    id?: number;
    firstname?: string;
    lastname?: string;
    constructor(data: unknown) {
        if(typeof data !== 'object' || Array.isArray(data) || data === null) {
            throw new Error('Person musi być pojedynczym obiektem');
        }
        const obj = data as Record<string, any>;
        if(typeof obj.firstname !== 'string' 
           || (this.firstname = obj.firstname.trim()).length == 0
           || typeof obj.lastname !== 'string'
           || (this.lastname = obj.lastname.trim()).length == 0) {
            throw new Error('Person musi mieć firstname i lastname');
        }
        this.id = ++Person.seq;
    }
}

const persons: Person[] = [];

export function personRouter(connection: Database): Router {
    const router = Router();

    router.post('/', (req: Request, res: Response) => {
        const person: Person = new Person(req.body);
        persons.push(person);
        res.json(person);
    });

    router.get('/', (_req: Request, res: Response) => {
        res.json(persons);
    });

    router.delete('/', (req: Request, res: Response) => {
        let deleted: number = 0;
        const id = req.query.id ? parseInt(req.query.id as string) : 0;
        if(id) {
            const index: number = persons.findIndex(el => el.id == id);
            if(index >= 0) {
                persons.splice(index, 1);
                deleted = 1;
            }
        }
        res.json({ deleted });
    });


    return router;
}