import { DatabaseSync } from 'node:sqlite';
import { fakerPL as faker } from '@faker-js/faker';

const config = {
    dbfilename: './data/app.sqlite3',
    FAKEPATIENTS: 50,
    FAKEDOCTORS: 10,
    FAKEOFFICES: 5,
    FAKEAPPOINTMENTS: 30
};

console.log('createdb');

const connection = new DatabaseSync(config.dbfilename);
const { user_version } = connection.prepare('PRAGMA user_version;').get();

if(!user_version) { 
    connection.exec('PRAGMA user_version = 1;');
    connection.exec('PRAGMA foreign_keys = ON');
    
    console.log('* inicjalizacja tabel kliniki...');
    connection.exec(`
        CREATE TABLE patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            firstname TEXT NOT NULL,
            lastname TEXT NOT NULL,
            pesel TEXT UNIQUE,
            phone TEXT
        );

        CREATE TABLE doctors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            firstname TEXT NOT NULL,
            lastname TEXT NOT NULL,
            specialization TEXT
        );

        CREATE TABLE offices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_number TEXT UNIQUE NOT NULL
        );

        CREATE TABLE appointments (
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
    `);

    console.log(`* generowanie ${config.FAKEPATIENTS} pacjentów`);
    const insertPatient = connection.prepare('INSERT INTO patients (firstname, lastname, pesel, phone) VALUES (?, ?, ?, ?)');
    for(let i = 0; i < config.FAKEPATIENTS; i++) {
        insertPatient.run(faker.person.firstName(), faker.person.lastName(), faker.string.numeric(11), faker.phone.number());
    }

    console.log(`* generowanie ${config.FAKEDOCTORS} lekarzy`);
    const specializations = ['Kardiolog', 'Pediatra', 'Chirurg', 'Dermatolog', 'Okulista'];
    const insertDoctor = connection.prepare('INSERT INTO doctors (firstname, lastname, specialization) VALUES (?, ?, ?)');
    for(let i = 0; i < config.FAKEDOCTORS; i++) {
        insertDoctor.run(faker.person.firstName(), faker.person.lastName(), faker.helpers.arrayElement(specializations));
    }

    console.log(`* generowanie ${config.FAKEOFFICES} gabinetów`);
    const insertOffice = connection.prepare('INSERT INTO offices (room_number) VALUES (?)');
    for(let i = 0; i < config.FAKEOFFICES; i++) {
        insertOffice.run(`Gabinet ${100 + i}`);
    }

    console.log(`* generowanie ${config.FAKEAPPOINTMENTS} wizyt`);
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

    console.log('* baza stworzona pomyślnie');
} else {
    console.log('* baza juz istnieje');
}