// src/index.ts
import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';

import { initAuth } from './auth';
import * as authApi from './api/auth'; 
import { initPatientApi } from './api/patient';
import { initDoctorApi } from './api/doctor';

const config = {
    port: 3000,
    dbFilename: './data/app.sqlite3',
    sysDbFilename: './data/sys.sqlite3',
    sessionSecret: 'secret',
    sessionMaxAge: 1000 * 60 * 60 * 24 * 7, // 7 dni
    adminPassword: 'admin',
    userPassword: 'user'
};

const app = express();
app.use(express.json());

async function startServer() {
    // Inicjalizacja autoryzacji
    await initAuth(app, config);

    // Bezpieczne wpięcie API autoryzacji niezależnie od nazwy eksportu
    if (typeof (authApi as any).initAuthApi === 'function') {
        (authApi as any).initAuthApi(app);
    } else if (typeof (authApi as any).init === 'function') {
        (authApi as any).init(app);
    } else if (typeof (authApi as any).default === 'function') {
        (authApi as any).default(app);
    }

    // Inicjalizacja API biznesowego dla Przychodni
    const db = new DatabaseSync(config.dbFilename);
    initPatientApi(app, db);
    initDoctorApi(app, db);

    // Obsługa błędów API
    app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
        res.status(err.status || 500).json({
            error: err.message || 'Wewnętrzny błąd serwera'
        });
    });

    // Serwowanie statycznych plików Angulara
    app.use(express.static(path.join(__dirname, '../frontend/dist/frontend/browser')));
    app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/frontend/browser/index.html'));
    });

    // Start serwera
    app.listen(config.port, () => {
        console.log(`Server listening on port ${config.port}`);
    });
    }

startServer().catch(console.error);