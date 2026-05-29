import { Routes } from '@angular/router';
import { Home } from './home/home';
import { AuthPanel } from './auth/auth-panel';
import { Settings } from './settings/settings';
import { Stats } from './stats/stats';
import { roleGuard } from './auth/auth.guard';
import { Patients } from './patients/patients';

export const routes: Routes = [
    { path: '', component: Home, title: 'Strona główna', data: { icon: 'home' } },
    { path: 'patients', component: Patients, title: 'Pacjenci', canMatch: [roleGuard], data: { roles: [0, 2], icon: 'people' } },
    { path: 'stats', component: Stats, title: 'Statystyki', canMatch: [roleGuard], data: { roles: [0], icon: 'bar_chart' } },
    { path: 'settings', component: Settings, title: 'Ustawienia', canMatch: [roleGuard], data: { roles: [0], icon: 'settings' } },
    { path: '**', redirectTo: '' }
];