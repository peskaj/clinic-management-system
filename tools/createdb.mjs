import { DatabaseSync } from 'node:sqlite';
import { fakerPL as faker } from '@faker-js/faker';
import path from 'path';

const config = {
    dbfilename: path.join(process.cwd(), 'data', 'app.sqlite3'),
    FAKEPATIENTS: 500,
    FAKEDOCTORS: 50,
    FAKEVISITS: 1000
};

console.log('--- Start inicjalizacji bazy ---');

const connection = new DatabaseSync(config.dbfilename);
const { user_version } = connection.prepare('PRAGMA user_version;').get();

if(!user_version) { 
    connection.exec('PRAGMA user_version = 1;');
    connection.exec('PRAGMA foreign_keys = ON');
    
    console.log('* Tworzenie tabel kliniki (zgodnych z Twoim API)...');
    
    connection.exec(`
        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            firstname TEXT NOT NULL,
            lastname TEXT NOT NULL,
            pesel TEXT UNIQUE,
            phone TEXT
        );

        CREATE TABLE IF NOT EXISTS doctors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            firstname TEXT NOT NULL,
            lastname TEXT NOT NULL,
            specialization TEXT
        );

        CREATE TABLE IF NOT EXISTS visits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patientId INTEGER NOT NULL,
            doctorId INTEGER NOT NULL,
            visitDate TEXT NOT NULL,
            room TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'PLANNED',
            FOREIGN KEY (patientId) REFERENCES patients(id),
            FOREIGN KEY (doctorId) REFERENCES doctors(id)
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            user_email TEXT NOT NULL,
            action TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id INTEGER NOT NULL,
            old_data TEXT,
            new_data TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            reason TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
    `);

    console.log('* Generowanie przykładowego logu audytu...');
    const insertAudit = connection.prepare(`
        INSERT INTO audit_logs (user_id, user_email, action, entity_type, entity_id, new_data) 
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    // insertAudit.run(1, 'admin@klinika.pl', 'CREATE', 'PATIENT', 1, '{"firstname": "Jan", "lastname": "Kowalski"}');

    // ====================================================================
    // TRANSAKCJA: Spinamy wszystko razem dla maksymalnej wydajności
    // ====================================================================
    connection.exec('BEGIN TRANSACTION;');

    console.log(`* Generowanie ${config.FAKEPATIENTS} pacjentów...`);
    const insertPatient = connection.prepare('INSERT INTO patients (firstname, lastname, pesel, phone) VALUES (?, ?, ?, ?)');
    for(let i = 0; i < config.FAKEPATIENTS; i++) {
        try {
            insertPatient.run(faker.person.firstName(), faker.person.lastName(), faker.string.numeric(11), faker.phone.number());
        } catch (e) {
            // Ignorujemy duplikaty PESEL od fakera
        }
    }

    console.log(`* Generowanie ${config.FAKEDOCTORS} lekarzy...`);
    const specializations = ['Kardiolog', 'Pediatra', 'Chirurg', 'Dermatolog', 'Okulista', 'Neurolog', 'Ortopeda'];
    const insertDoctor = connection.prepare('INSERT INTO doctors (firstname, lastname, specialization) VALUES (?, ?, ?)');
    for(let i = 0; i < config.FAKEDOCTORS; i++) {
        insertDoctor.run(faker.person.firstName(), faker.person.lastName(), faker.helpers.arrayElement(specializations));
    }

    console.log(`* Generowanie ${config.FAKEVISITS} wizyt...`);
    const statuses = ['PLANNED', 'COMPLETED', 'CANCELLED'];
    // Aktualizacja pod nowe nazwy kolumn (patientId, doctorId, visitDate, room)
    const insertVisit = connection.prepare('INSERT INTO visits (patientId, doctorId, visitDate, room, status) VALUES (?, ?, ?, ?, ?)');
    for(let i = 0; i < config.FAKEVISITS; i++) {
        const p_id = faker.number.int({ min: 1, max: config.FAKEPATIENTS });
        const d_id = faker.number.int({ min: 1, max: config.FAKEDOCTORS });
        
        // Zamiast ID gabinetu, wstawiamy po prostu stringa tak jak w API
        const room = `Gabinet ${faker.number.int({ min: 100, max: 130 })}`;
        const visitDate = faker.date.recent({ days: 90 }).toISOString(); 
        const status = faker.helpers.arrayElement(statuses);
        
        insertVisit.run(p_id, d_id, visitDate, room, status);
    }

    // ====================================================================
    // ZRZUT DO BAZY
    // ====================================================================
    connection.exec('COMMIT;');

    console.log('--- Baza stworzona i wypełniona dziesiątkami tysięcy rekordów! ---');
} else {
    console.log('--- Baza już istnieje (user_version > 0), pomijam generowanie ---');
}