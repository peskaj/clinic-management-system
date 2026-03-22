import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { fakerPL as faker } from '@faker-js/faker';

const config = {
    dbfilename: './data/app.sqlite3',
    FAKEPERSONS: 100
};

console.log('createdb');

const connection = await open({
    filename: config.dbfilename,
    driver: sqlite3.Database
});
const { user_version } = await connection.get('PRAGMA user_version;');
if(!user_version) { // czysta baza?
    await connection.exec('PRAGMA user_version = 1;');
    await connection.exec('PRAGMA foreign_keys = ON'); // pilnuj związków kluczy obcych
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
    for(let i = 0; i < config.FAKEPERSONS; i++) { 
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const email = faker.internet.email({ firstName, lastName });
        const birthdate = faker.date.birthdate().toISOString().split('T')[0];
        console.log(firstName, lastName, email, birthdate);
        await connection.run('INSERT INTO persons (firstname, lastname, email, birthdate) VALUES (?, ?, ?, ?)',
            firstName, lastName, email, birthdate            
        );
    }
    console.log('* baza stworzona');

} else {
    console.log('* baza juz istnieje');
}