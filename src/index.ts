import express, { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';

const config = {
    port: 3000,
    frontend: 'frontend/dist/frontend/browser',
    api: '/api'
};

const app = express();
app.use(morgan('tiny'));
app.use(express.static(config.frontend));
app.use(express.json());

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

app.post(config.api + '/person', (req: Request, res: Response) => {
    const person: Person = new Person(req.body);
    persons.push(person);
    res.json(person);
});

app.get(config.api + '/person', (_req: Request, res: Response) => {
    res.json(persons);
});

app.delete(config.api + '/person', (req: Request, res: Response) => {
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

// obsługa błędów w Express - musi być ostatnim handlerem
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(400).json({ error: err.message });
});

app.listen(config.port, () => {
    console.log(`Serwer wystartował na porcie ${config.port}`);
});