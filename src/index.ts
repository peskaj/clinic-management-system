import express, { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

import { personRouter } from './api/person'

const config = {
    port: 3000,
    frontend: 'frontend/dist/frontend/browser',
    api: '/api',
    dbfilename: 'data/app.sqlite3'
};

const app = express();
app.use(morgan('tiny'));
app.use(express.static(config.frontend));
app.use(express.json());

async function main() {
    // połączenie z bazą danych
    const connection = await open({
        filename: config.dbfilename,
        driver: sqlite3.Database
    });
    await connection.run('PRAGMA foreign_keys = ON');

    app.use(config.api + '/person', personRouter(connection));

    // nieobsłużone endpointy
    app.use(config.api, (_req: Request, res: Response, _next: NextFunction) => {
        res.status(404).json({ error: 'endpoint not handled' });
    });

    // obsługa błędów w Express - musi być ostatnim handlerem
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
        res.status(400).json({ error: err.message });
    });

    // rozpoczynamy nasłuchiwanie
    app.listen(config.port, () => {
        console.log(`Serwer wystartował na porcie ${config.port}`);
    });
}

main().catch(err => {
    console.error(`Błąd uruchomienia serwera [${err.code}]: ${err.message}`);
    process.exit(1);
});