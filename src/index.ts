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

app.get(config.api + '/hello', (req: Request, res: Response) => {
    const result: { message: string, q?: string } = { message: 'Hello world' };
    if(typeof req.query.q === 'string') {
        result.q = req.query.q;
    }
    res.json(result);
});

// obsługa błędów w Express - musi być ostatnim handlerem
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(400).json({ error: err.message });
});

app.listen(config.port, () => {
    console.log(`Serwer wystartował na porcie ${config.port}`);
});