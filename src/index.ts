import express, { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import { DatabaseSync } from 'node:sqlite';

import { initAuth } from './auth';
import { authRouter } from './api/auth';
import { personRouter } from './api/person'
import { projectRouter } from './api/project';

const config = {
    port: 4000,
    frontend: 'frontend/dist/frontend/browser',
    api: '/api',
    dbfilename: 'data/app.sqlite3',
    sysDbFilename: 'data/sys.sqlite3',
    sessionSecret: 'tajne!',
    sessionMaxAge: 86400000,
    adminPassword: 'Admin123',
    userPassword: 'User123'
};

const app = express();
app.use(morgan('tiny'));
app.use(express.static(config.frontend));
app.use(express.json());

async function main() {

    // inicjalizacja mechanizmu autoryzacji
    await initAuth(app, config);
    app.use(config.api + '/auth', authRouter());

    // połączenie z aplikacyjną bazą danych
    const connection = new DatabaseSync(config.dbfilename);
    connection.exec('PRAGMA foreign_keys = ON');

    app.use(config.api + '/person', personRouter(connection));
    app.use(config.api + '/project', projectRouter(connection));

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