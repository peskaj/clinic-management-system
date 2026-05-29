import { DatabaseSync } from 'node:sqlite';
import { fakerPL as faker } from '@faker-js/faker';
import path from 'path';

const config = {
    dbfilename: path.join(process.cwd(), 'data', 'app.sqlite3'),
    FAKEPATIENTS: 50,
    FAKEDOCTORS: 10,
    FAKEOFFICES: 5,
    FAKEAPPOINTMENTS: 30
};

console.log('--- Start inicjalizacji bazy ---');

const connection = new DatabaseSync(config.dbfilename);
const { user_version } = connection.prepare('PRAGMA user_version;').get();

if(!user_version) { 
    connection.exec('PRAGMA user_version = 1;');
    connection.exec('PRAGMA foreign_keys = ON');
    
    console.log('* Tworzenie tabel kliniki (jeśli nie istnieją)...');
    
    // ZABEZPIECZENIE: Dodano IF NOT EXISTS do każdej tabeli
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

        CREATE TABLE IF NOT EXISTS offices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_number TEXT UNIQUE NOT NULL
        );

        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            doctor_id INTEGER NOT NULL,
            office_id INTEGER NOT NULL,
            date_time DATETIME NOT NULL,
            status TEXT NOT NULL DEFAULT 'PLANNED',
            FOREIGN KEY (patient_id) REFERENCES patients(id),
            FOREIGN KEY (doctor_id) REFERENCES doctors(id),
            FOREIGN KEY (office_id) REFERENCES offices(id)
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
    insertAudit.run(1, 'admin@klinika.pl', 'CREATE', 'PATIENT', 1, '{"firstname": "Jan", "lastname": "Kowalski"}');


    console.log(`* Generowanie ${config.FAKEPATIENTS} pacjentów...`);
    const insertPatient = connection.prepare('INSERT INTO patients (firstname, lastname, pesel, phone) VALUES (?, ?, ?, ?)');
    for(let i = 0; i < config.FAKEPATIENTS; i++) {
        // Używamy catch w razie gdyby faker wygenerował dwa takie same PESELE (co się zdarza rzadko, ale jednak)
        try {
            insertPatient.run(faker.person.firstName(), faker.person.lastName(), faker.string.numeric(11), faker.phone.number());
        } catch (e) {
            // Ignorujemy duplikaty PESEL
        }
    }

    console.log(`* Generowanie ${config.FAKEDOCTORS} lekarzy...`);
    const specializations = ['Kardiolog', 'Pediatra', 'Chirurg', 'Dermatolog', 'Okulista'];
    const insertDoctor = connection.prepare('INSERT INTO doctors (firstname, lastname, specialization) VALUES (?, ?, ?)');
    for(let i = 0; i < config.FAKEDOCTORS; i++) {
        insertDoctor.run(faker.person.firstName(), faker.person.lastName(), faker.helpers.arrayElement(specializations));
    }

    console.log(`* Generowanie ${config.FAKEOFFICES} gabinetów...`);
    const insertOffice = connection.prepare('INSERT INTO offices (room_number) VALUES (?)');
    for(let i = 0; i < config.FAKEOFFICES; i++) {
        insertOffice.run(`Gabinet ${100 + i}`);
    }

    console.log(`* Generowanie ${config.FAKEAPPOINTMENTS} wizyt...`);
    const statuses = ['PLANNED', 'COMPLETED', 'CANCELLED'];
    const insertAppointment = connection.prepare('INSERT INTO appointments (patient_id, doctor_id, office_id, date_time, status) VALUES (?, ?, ?, ?, ?)');
    for(let i = 0; i < config.FAKEAPPOINTMENTS; i++) {
        const p_id = faker.number.int({ min: 1, max: config.FAKEPATIENTS });
        const d_id = faker.number.int({ min: 1, max: config.FAKEDOCTORS });
        const o_id = faker.number.int({ min: 1, max: config.FAKEOFFICES });
        const date_time = faker.date.soon({ days: 14 }).toISOString();
        const status = faker.helpers.arrayElement(statuses);
        insertAppointment.run(p_id, d_id, o_id, date_time, status);
    }

    console.log('--- Baza stworzona i wypełniona pomyślnie ---');
} else {
    console.log('--- Baza już istnieje (user_version > 0), pomijam generowanie ---');
}