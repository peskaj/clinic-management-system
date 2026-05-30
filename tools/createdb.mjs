import { DatabaseSync } from 'node:sqlite';
import { fakerPL as faker } from '@faker-js/faker';
import path from 'path';

const config = {
    dbfilename: path.join(process.cwd(), 'data', 'app.sqlite3'),
    FAKEROOMS: 50,     // Tworzymy dokładnie tyle gabinetów, ilu lekarzy (relacja 1:1)
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
    
    console.log('* Tworzenie tabel kliniki (zgodnych z nową architekturą API)...');
    
    connection.exec(`
        CREATE TABLE IF NOT EXISTS rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            type TEXT
        );

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
            specialization TEXT,
            roomId INTEGER UNIQUE,
            FOREIGN KEY (roomId) REFERENCES rooms(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS visits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patientId INTEGER NOT NULL,
            doctorId INTEGER NOT NULL,
            visitDate TEXT NOT NULL,
            room TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'zaplanowana',
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

    // ====================================================================
    // TRANSAKCJA: Spinamy wszystko razem dla maksymalnej wydajności
    // ====================================================================
    connection.exec('BEGIN TRANSACTION;');

    // 1. Generowanie GABINETÓW
    console.log(`* Generowanie ${config.FAKEROOMS} gabinetów...`);
    const insertRoom = connection.prepare('INSERT INTO rooms (name, type) VALUES (?, ?)');
    const roomTypes = ['Konsultacyjny', 'Zabiegowy', 'Diagnostyczny'];
    const roomsMap = {}; // Słownik do szybkiego wyszukiwania gabinetu po ID lekarza

    for(let i = 1; i <= config.FAKEROOMS; i++) {
        const roomName = `Gabinet ${100 + i}`;
        const type = faker.helpers.arrayElement(roomTypes);
        insertRoom.run(roomName, type);
        roomsMap[i] = roomName; // Ponieważ tworzymy je po kolei, ID gabinetu będzie równe 'i'
    }

    // 2. Generowanie LEKARZY (i sztywne przypisanie do gabinetu)
    console.log(`* Generowanie ${config.FAKEDOCTORS} lekarzy i przypisywanie im gabinetów...`);
    const specializations = ['Kardiolog', 'Pediatra', 'Chirurg', 'Dermatolog', 'Okulista', 'Neurolog', 'Ortopeda'];
    const insertDoctor = connection.prepare('INSERT INTO doctors (firstname, lastname, specialization, roomId) VALUES (?, ?, ?, ?)');
    
    for(let i = 1; i <= config.FAKEDOCTORS; i++) {
        insertDoctor.run(
            faker.person.firstName(), 
            faker.person.lastName(), 
            faker.helpers.arrayElement(specializations),
            i // Przypisujemy ID gabinetu (1:1)
        );
    }

    // 3. Generowanie PACJENTÓW
    console.log(`* Generowanie ${config.FAKEPATIENTS} pacjentów...`);
    const insertPatient = connection.prepare('INSERT INTO patients (firstname, lastname, pesel, phone) VALUES (?, ?, ?, ?)');
    for(let i = 0; i < config.FAKEPATIENTS; i++) {
        try {
            insertPatient.run(faker.person.firstName(), faker.person.lastName(), faker.string.numeric(11), faker.phone.number());
        } catch (e) {
            // Ignorujemy duplikaty PESEL od fakera
        }
    }

    // 4. Generowanie WIZYT (z automatycznym gabinetem i reżimem godzinowym 8-16)
    console.log(`* Generowanie ${config.FAKEVISITS} wizyt...`);
    const statuses = ['zaplanowana', 'zakończona', 'CANCELLED']; 
    const insertVisit = connection.prepare('INSERT INTO visits (patientId, doctorId, visitDate, room, status) VALUES (?, ?, ?, ?, ?)');
    
    for(let i = 0; i < config.FAKEVISITS; i++) {
        const p_id = faker.number.int({ min: 1, max: config.FAKEPATIENTS });
        const d_id = faker.number.int({ min: 1, max: config.FAKEDOCTORS });
        
        const roomName = roomsMap[d_id]; 
        
        // Manipulacja datą, aby wizyty miały sens biznesowy
        const randomDate = faker.date.recent({ days: 60 });
        
        // Przesunięcie weekendów na dni robocze (niedziela -> poniedziałek, sobota -> wtorek)
        if (randomDate.getDay() === 0) randomDate.setDate(randomDate.getDate() + 1);
        if (randomDate.getDay() === 6) randomDate.setDate(randomDate.getDate() + 3);

        // Sztywny czas pracy: 8:00 - 15:30 (okienka po 30 min)
        randomDate.setHours(faker.number.int({ min: 8, max: 15 }));
        randomDate.setMinutes(faker.helpers.arrayElement([0, 30]));
        randomDate.setSeconds(0);
        randomDate.setMilliseconds(0);

        // Formatowanie pod strefę czasową lokalną, aby idealnie pasowało do walidacji backendu
        const tzOffset = randomDate.getTimezoneOffset() * 60000;
        const visitDate = new Date(randomDate.getTime() - tzOffset).toISOString().slice(0, 16);
        
        const status = faker.helpers.arrayElement(statuses);
        
        insertVisit.run(p_id, d_id, visitDate, roomName, status);
    }

    // ====================================================================
    // ZRZUT DO BAZY
    // ====================================================================
    connection.exec('COMMIT;');

    console.log('--- Baza stworzona i wypełniona dziesiątkami tysięcy spójnych rekordów! ---');
} else {
    console.log('--- Baza już istnieje (user_version > 0), pomijam generowanie ---');
}