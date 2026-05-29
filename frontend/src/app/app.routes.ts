import { Routes } from '@angular/router';
import { Home } from './home/home';
import { AuthPanel } from './auth/auth-panel';
import { Settings } from './settings/settings';
import { Stats } from './stats/stats';
import { roleGuard } from './auth/auth.guard';
import { Patients } from './patients/patients';
import { Doctors } from './doctors/doctors';
import { Visits } from './visits/visits';

export const routes: Routes = [
    { path: '', component: Home, title: 'Strona główna', data: { icon: 'home' } },
    
    { path: 'patients', component: Patients, title: 'Pacjenci', canMatch: [roleGuard], data: { roles: [0, 1, 2], icon: 'people' } },
    { path: 'visits', component: Visits, title: 'Wizyty', canMatch: [roleGuard], data: { roles: [0, 1, 2], icon: 'event' } },
    
    // Lekarze, Statystyki i Ustawienia zostają tylko dla Admina (0)
    { path: 'doctors', component: Doctors, title: 'Lekarze', canMatch: [roleGuard], data: { roles: [0, 1], icon: 'medical_services' } },
    { path: 'stats', component: Stats, title: 'Statystyki', canMatch: [roleGuard], data: { roles: [0], icon: 'bar_chart' } },
    { path: 'settings', component: Settings, title: 'Ustawienia', canMatch: [roleGuard], data: { roles: [0], icon: 'settings' } },
    
    { path: '**', redirectTo: '' }
];