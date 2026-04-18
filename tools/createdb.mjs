import { DatabaseSync } from 'node:sqlite';
import { fakerPL as faker } from '@faker-js/faker';

const config = {
    dbfilename: './data/app.sqlite3',
    FAKEPERSONS: 100,
    FAKEPROJECTS: 20
};

console.log('createdb');

const connection = new DatabaseSync(config.dbfilename);
const { user_version } = connection.prepare('PRAGMA user_version;').get();
if(!user_version) { // czysta baza?
    connection.exec('PRAGMA user_version = 1;');
    connection.exec('PRAGMA foreign_keys = ON'); // pilnuj związków kluczy obcych
    console.log('* inicjalizacja tabeli persons...');
    connection.exec(`

        CREATE TABLE persons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            firstname TEXT,
            lastname TEXT,
            email TEXT,
            birthdate DATE
        )

    `);
    console.log(`* generowanie ${config.FAKEPERSONS} losowych osób`);
    const insertPerson = connection.prepare('INSERT INTO persons (firstname, lastname, email, birthdate) VALUES (?, ?, ?, ?)');
    for(let i = 0; i < config.FAKEPERSONS; i++) {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const email = faker.internet.email({ firstName, lastName });
        const birthdate = faker.date.birthdate().toISOString().split('T')[0];
        console.log(firstName, lastName, email, birthdate);
        insertPerson.run(firstName, lastName, email, birthdate);
    }
    console.log('* inicjalizacja tabeli projects...');
    connection.exec(`

        CREATE TABLE projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            shortname TEXT,
            manager_id INTEGER,
            FOREIGN KEY (manager_id) REFERENCES persons(id)
        )

    `);
    console.log(`* generowanie ${config.FAKEPROJECTS} losowych projektów`);
    const insertProject = connection.prepare('INSERT INTO projects (name, shortname, manager_id) VALUES (?, ?, ?)');
    for(let i = 0; i < config.FAKEPROJECTS; i++) {
        const name = faker.company.name();
        const shortname = name.split(' ').map(word => word.at(0)).join('');
        const manager_id = Math.floor(Math.random() * config.FAKEPERSONS) + 1;
        console.log(name, shortname, manager_id);
        insertProject.run(name, shortname, manager_id);
    }
    console.log('* baza stworzona');

} else {
    console.log('* baza juz istnieje');
}
