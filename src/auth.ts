import { Request, Response, NextFunction, RequestHandler } from 'express';
import { Application } from 'express';
import { DatabaseSync } from 'node:sqlite';
import session from 'express-session';
import connectSqlite3 from 'connect-sqlite3';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import createError from 'http-errors';

declare global {
    namespace Express {
        interface User {
            id: number;
            username: string;
            roles: number[];
        }
    }
}

// --- Inicjalizacja sys.sqlite3 ---
async function initSysDb(filename: string, adminPassword: string, userPassword: string): Promise<DatabaseSync> {
    const db = new DatabaseSync(filename);

    db.exec(`CREATE TABLE IF NOT EXISTS users (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        username      TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        roles         TEXT NOT NULL DEFAULT '[]'
    )`);

    const count = db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number };
    if ((count?.c ?? 0) === 0) {
        const insertUser = db.prepare('INSERT INTO users (username, password_hash, roles) VALUES (?, ?, ?)');
        
        // 0 - Admin, 1 - Lekarz, 2 - Recepcjonista
        const adminHash = await bcrypt.hash(adminPassword, 10);
        insertUser.run('admin', adminHash, JSON.stringify([0]));
        console.log(`Utworzono administratora: admin:${adminPassword} (role: [0])`);
        
        const docHash = await bcrypt.hash(userPassword, 10);
        insertUser.run('doctor', docHash, JSON.stringify([1]));
        console.log(`Utworzono lekarza: doctor:${userPassword} (role: [1])`);

        const recHash = await bcrypt.hash(userPassword, 10);
        insertUser.run('reception', recHash, JSON.stringify([2]));
        console.log(`Utworzono recepcjonistę: reception:${userPassword} (role: [2])`);
    }

    return db;
}

// --- Konfiguracja passport i sesji ---
export async function initAuth(
    app: Application,
    config: { sysDbFilename: string; sessionSecret: string; sessionMaxAge: number; adminPassword: string; userPassword: string }
): Promise<void> {
    const db = await initSysDb(config.sysDbFilename, config.adminPassword, config.userPassword);

    const [dir, db_name] = (() => {
        const i = config.sysDbFilename.lastIndexOf('/');
        return i === -1
            ? ['.', config.sysDbFilename]
            : [config.sysDbFilename.slice(0, i), config.sysDbFilename.slice(i + 1)];
    })();
    const SQLiteStore = connectSqlite3(session);

    app.use(session({
        store: new SQLiteStore({ db: db_name, dir, table: 'sessions' }) as unknown as session.Store,
        secret: config.sessionSecret,
        resave: false,
        saveUninitialized: false,
        cookie: { httpOnly: true, maxAge: config.sessionMaxAge }
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    passport.use(new LocalStrategy(async (username, password, done) => {
        try {
            const row = db.prepare('SELECT id, username, password_hash, roles FROM users WHERE username = ?')
                .get(username) as { id: number; username: string; password_hash: string; roles: string } | undefined;
            if (!row) return done(null, false, { message: 'Nieprawidłowe dane logowania' });
            const ok = await bcrypt.compare(password, row.password_hash);
            if (!ok) return done(null, false, { message: 'Nieprawidłowe dane logowania' });
            done(null, { id: row.id, username: row.username, roles: JSON.parse(row.roles) as number[] });
        } catch (e) {
            done(e);
        }
    }));

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser((id: number, done) => {
        try {
            const row = db.prepare('SELECT id, username, roles FROM users WHERE id = ?')
                .get(id) as { id: number; username: string; roles: string } | undefined;
            if (!row) return done(null, false);
            done(null, { id: row.id, username: row.username, roles: JSON.parse(row.roles) as number[] });
        } catch (e) {
            done(e);
        }
    });
}

export function requireAuth(...roles: number[]): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.isAuthenticated()) return next(createError(401, 'Wymagana autoryzacja'));
        if (roles.length > 0) {
            const userRoles = new Set(req.user!.roles);
            const hasRole = roles.some(r => userRoles.has(r));
            if (!hasRole) return next(createError(403, 'Brak uprawnień'));
        }
        next();
    };
}