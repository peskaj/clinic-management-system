import express, { Request, Response } from 'express';

const config = {
    port: 3000
}

const app = express();

app.get('/hello', (req: Request, res: Response) => {
    const result: { message: string, q?: string } = { message: 'Hello world' };
    if(typeof req.query.q === 'string') {
        result.q = req.query.q;
    }
    res.json(result);
})

app.listen(config.port, () => {
    console.log(`Serwer wystartował na porcie ${config.port}`);
});